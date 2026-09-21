// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title InvoiceRegistry
 * @notice On-chain invoices settled in Circle stablecoins on Arc.
 *
 * ChaosPay's off-chain matcher (`src/lib/reconcile.ts`) has to *guess* which
 * incoming transfer settles which payment request: it pairs them on exact
 * amount, recipient and time order, because a bare ERC-20 `transfer` carries
 * no invoice reference. Every rule in that file is a workaround for a fact
 * the payer knew and the chain never recorded.
 *
 * `pay()` records it. The payer names the invoice, the transfer and the
 * settlement are one transaction, and reconciliation becomes a read instead
 * of a heuristic. Partial payments are kept as separate settlements, which is
 * what accounts receivable actually looks like.
 *
 * Custody: none. `pay()` moves tokens straight from payer to issuer; this
 * contract is never a balance holder, never an approval target for anything
 * but the amount being paid, and has no owner, no admin and no upgrade path.
 */
interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract InvoiceRegistry {
    // The top bit separates caller-chosen IDs from IDs derived for public
    // payment links. This stops somebody who sees a link from reserving its ID
    // through `createInvoice` before the real payer settles it.
    uint256 private constant DIRECT_ID_FLAG = 1 << 255;
    bytes32 private constant DIRECT_INVOICE_TYPEHASH = keccak256(
        "ChaosPayDirectInvoiceV1(bytes32 requestKey,address issuer,address token,uint256 amount,bytes32 memoHash)"
    );

    enum Status {
        None,
        Open,
        Paid,
        Cancelled
    }

    struct Invoice {
        address issuer;
        /// @dev Restricts who may pay. `address(0)` leaves the invoice open to anyone.
        address payer;
        address token;
        uint256 amount;
        uint256 paid;
        uint64 dueAt;
        uint64 createdAt;
        Status status;
        /// @dev Commitment to the off-chain memo/reference. Keeps terms private, keeps them provable.
        bytes32 memoHash;
    }

    mapping(bytes32 => Invoice) private _invoices;

    event InvoiceCreated(
        bytes32 indexed id,
        address indexed issuer,
        address indexed payer,
        address token,
        uint256 amount,
        uint64 dueAt,
        bytes32 memoHash
    );

    event InvoicePaid(
        bytes32 indexed id,
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 totalPaid,
        bool settled
    );

    event InvoiceCancelled(bytes32 indexed id, address indexed issuer);

    error InvoiceExists(bytes32 id);
    error InvoiceUnknown(bytes32 id);
    error InvoiceNotOpen(bytes32 id);
    error NotIssuer(bytes32 id);
    error WrongPayer(bytes32 id);
    error ZeroAmount();
    error ZeroToken();
    error AlreadyPaid(bytes32 id);
    error TransferFailed(address token);
    error ZeroIssuer();
    error ReservedDirectId(bytes32 id);

    /**
     * @notice Open an invoice.
     * @param id Caller-chosen identifier, unique across the registry. ChaosPay
     *           uses `keccak256` of the invoice UUID it already stores, so the
     *           off-chain record and the on-chain one share one key.
     * @param payer Address allowed to pay, or `address(0)` for a public link.
     * @param token ERC-20 to be paid in — USDC or EURC on Arc.
     * @param amount Total due, in the token's own units.
     * @param dueAt Unix seconds; `0` means no due date. Never enforced on-chain,
     *              only recorded, because lateness is a commercial question.
     * @param memoHash Commitment to the off-chain memo and reference, or zero.
     */
    function createInvoice(
        bytes32 id,
        address payer,
        address token,
        uint256 amount,
        uint64 dueAt,
        bytes32 memoHash
    ) external {
        if (uint256(id) & DIRECT_ID_FLAG != 0) revert ReservedDirectId(id);
        if (_invoices[id].status != Status.None) revert InvoiceExists(id);
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert ZeroToken();

        _invoices[id] = Invoice({
            issuer: msg.sender,
            payer: payer,
            token: token,
            amount: amount,
            paid: 0,
            dueAt: dueAt,
            createdAt: uint64(block.timestamp),
            status: Status.Open,
            memoHash: memoHash
        });

        emit InvoiceCreated(id, msg.sender, payer, token, amount, dueAt, memoHash);
    }

    /**
     * @notice Pay an invoice, in full or in part, and record the settlement.
     * @dev Requires an ERC-20 allowance to this contract for `amount`. The
     *      tokens go to the issuer in the same call; nothing rests here.
     *      Paying more than the balance due is allowed and recorded — an
     *      overpayment is a real event, and refusing it would strand funds the
     *      payer already meant to send.
     */
    function pay(bytes32 id, uint256 amount) external {
        Invoice storage invoice = _invoices[id];
        if (invoice.status == Status.None) revert InvoiceUnknown(id);
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id);
        if (invoice.payer != address(0) && invoice.payer != msg.sender) revert WrongPayer(id);
        if (amount == 0) revert ZeroAmount();

        uint256 totalPaid = invoice.paid + amount;
        bool settled = totalPaid >= invoice.amount;

        invoice.paid = totalPaid;
        if (settled) invoice.status = Status.Paid;

        address token = invoice.token;
        _pullTo(token, msg.sender, invoice.issuer, amount);

        emit InvoicePaid(id, msg.sender, token, amount, totalPaid, settled);
    }

    /**
     * @notice Open and settle an invoice in one transaction, paid by the caller.
     *
     * This is the path behind a ChaosPay payment link. The request lives only
     * in the issuer's browser until someone pays it, so there is no invoice
     * on-chain to call `pay` against, and asking the issuer to publish one
     * first would put a signature and a gas fee in front of an action that is
     * currently free and instant.
     *
     * The payer signs an EIP-2612 permit off-chain — Arc's USDC implements it,
     * and a signature costs nothing — so the whole settlement is still the one
     * transaction it was before this contract existed, while the chain now
     * records which invoice was paid instead of leaving an anonymous transfer
     * for an off-chain matcher to guess at.
     *
     * @dev The permit is attempted but not required. An identical permit that
     *      was already mined, or an allowance granted the ordinary way, leaves
     *      it reverting on a spent nonce; that must not fail a payment whose
     *      allowance is in place regardless. If no allowance exists by then,
     *      the pull below reverts and takes the whole transaction with it.
     */
    function settleDirect(
        bytes32 requestKey,
        address issuer,
        address token,
        uint256 amount,
        bytes32 memoHash,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // The payment terms, rather than a payer-supplied final ID, determine
        // the record being settled. Altered terms therefore cannot poison the
        // invoice the issuer's link points to.
        bytes32 id = bytes32(
            uint256(
                keccak256(
                    abi.encode(DIRECT_INVOICE_TYPEHASH, requestKey, issuer, token, amount, memoHash)
                )
            ) | DIRECT_ID_FLAG
        );
        if (_invoices[id].status != Status.None) revert InvoiceExists(id);
        if (amount == 0) revert ZeroAmount();
        if (token == address(0)) revert ZeroToken();
        if (issuer == address(0)) revert ZeroIssuer();

        // Written before either external call: `token` is chosen by the payer,
        // so both calls below are to code this contract does not control.
        _invoices[id] = Invoice({
            issuer: issuer,
            payer: msg.sender,
            token: token,
            amount: amount,
            paid: amount,
            dueAt: 0,
            createdAt: uint64(block.timestamp),
            status: Status.Paid,
            memoHash: memoHash
        });

        try IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}

        _pullTo(token, msg.sender, issuer, amount);

        emit InvoiceCreated(id, issuer, msg.sender, token, amount, 0, memoHash);
        emit InvoicePaid(id, msg.sender, token, amount, amount, true);
    }

    /// @notice Withdraw an invoice that nobody has paid against yet.
    function cancel(bytes32 id) external {
        Invoice storage invoice = _invoices[id];
        if (invoice.status == Status.None) revert InvoiceUnknown(id);
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id);
        if (invoice.issuer != msg.sender) revert NotIssuer(id);
        if (invoice.paid != 0) revert AlreadyPaid(id);

        invoice.status = Status.Cancelled;
        emit InvoiceCancelled(id, msg.sender);
    }

    /// @notice Read an invoice. A never-created `id` comes back with `status == Status.None`.
    function getInvoice(bytes32 id) external view returns (Invoice memory) {
        return _invoices[id];
    }

    /// @notice Amount still owed, or zero once the invoice is settled or cancelled.
    function outstanding(bytes32 id) external view returns (uint256) {
        Invoice storage invoice = _invoices[id];
        if (invoice.status != Status.Open) return 0;
        if (invoice.paid >= invoice.amount) return 0;
        return invoice.amount - invoice.paid;
    }

    /// @notice Read several invoices in one call, for a dashboard's worth of rows.
    function getInvoices(bytes32[] calldata ids) external view returns (Invoice[] memory out) {
        out = new Invoice[](ids.length);
        for (uint256 i = 0; i < ids.length; ++i) {
            out[i] = _invoices[ids[i]];
        }
    }

    /**
     * @dev `transferFrom` that tolerates the tokens which return nothing instead
     *      of a bool. Arc's USDC returns one, but the registry accepts any
     *      ERC-20 the issuer names and must not assume the well-behaved case.
     */
    function _pullTo(address token, address from, address to, uint256 amount) private {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount) // transferFrom(address,address,uint256)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed(token);
    }
}
