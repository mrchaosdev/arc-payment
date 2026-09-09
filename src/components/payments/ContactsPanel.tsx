"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Label, PageHeading, Panel } from "@/components/chaos/Terminal";
import { Button } from "@/components/ui/Button";
import { useContacts } from "@/store/contacts";
import { useHydrated } from "@/hooks/useHydrated";

export function ContactsPanel() {
  const { contacts, save, remove } = useContacts();
  const hydrated = useHydrated();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<string>();
  const [removing, setRemoving] = useState<string>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const visible = hydrated
    ? contacts.filter((contact) => `${contact.name} ${contact.address}`.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  function reset() {
    setName("");
    setAddress("");
    setEditing(undefined);
    setError("");
  }

  return (
    <div className="contacts-page mx-auto max-w-[1000px] space-y-6">
      <div className="contacts-heading border-b border-[var(--border)] pb-6">
        <PageHeading
          eyebrow="Your payment workspace"
          title="Recipient contacts"
          subtitle="Save a name and address for your next USDC payment. Contacts stay in this browser."
        />
      </div>

      <Panel title={editing ? "Edit contact" : "Add recipient"} meta={hydrated ? `${contacts.length} SAVED` : "—"} bodyClassName="p-0">
        <form
          className="contacts-form space-y-5 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            setNotice("");
            try {
              save(name, address, editing);
              setNotice(editing ? "Contact updated." : "Contact saved.");
              reset();
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : "Could not save contact.");
            }
          }}
        >
          <div className="contacts-name-field">
            <Label className="mb-2">Name</Label>
            <input
              ref={nameInput}
              aria-label="Name"
              className="contacts-name-input payment-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={48}
              required
              autoComplete="off"
            />
          </div>
          <div className="contacts-address-field">
            <Label className="mb-2">Wallet address</Label>
            <input
              aria-label="Wallet address"
              className="contacts-address-input payment-input font-mono text-xs"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="0x..."
            />
            <p className="contacts-address-hint mt-2 text-[11px] leading-5 text-[var(--text-muted)]">
              Verify this address with the recipient. A saved name does not verify ownership.
            </p>
          </div>

          {error && (
            <p role="alert" className="contacts-error border-l-2 border-[var(--negative)] bg-[var(--negative)]/8 px-4 py-3 text-[13px] leading-6 text-[var(--negative)]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="contacts-notice font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--positive)]">
              {notice}
            </p>
          )}

          <div className="contacts-form-actions flex gap-3">
            <Button className="contacts-save-button" type="submit" disabled={!hydrated}>
              {editing ? "Save changes" : "Save contact"}
            </Button>
            {editing && (
              <Button className="contacts-cancel-button" type="button" variant="ghost" onClick={reset}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      </Panel>

      <Panel title="Saved contacts" meta={hydrated ? `${visible.length} SHOWN` : "—"} bodyClassName="p-0">
        <div className="contacts-search border-b border-[var(--border)] p-4">
          <Label className="mb-2">Search contacts</Label>
          <input
            aria-label="Search contacts"
            className="contacts-search-input payment-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or address"
          />
        </div>

        {!visible.length ? (
          <p className="contacts-empty px-6 py-12 text-center text-[13px] text-[var(--text-muted)]">
            {!hydrated ? "Loading contacts…" : contacts.length ? "No matching contacts." : "Add your first recipient above."}
          </p>
        ) : (
          <ul className="contacts-list">
            {visible.map((contact) => (
              <li key={contact.id} className="contacts-item border-b border-[var(--border)] p-4 last:border-b-0">
                <div className="contacts-item-header flex flex-wrap items-start justify-between gap-4">
                  <div className="contacts-item-details min-w-0">
                    <p className="contacts-item-name break-words text-[13px] font-semibold">{contact.name}</p>
                    <p className="contacts-item-address mt-1.5 break-all font-mono text-[10px] text-[var(--text-muted)]">
                      {contact.address}
                    </p>
                  </div>
                  <Link
                    href={{ pathname: "/pay", query: { to: contact.address } }}
                    className="contacts-send-link inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--action)]"
                  >
                    Send USDC <ArrowUpRight size={11} />
                  </Link>
                </div>

                <div className="contacts-item-actions mt-3 flex flex-wrap items-center gap-4">
                  <button
                    className="contacts-edit-button font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    type="button"
                    onClick={() => {
                      setEditing(contact.id);
                      setName(contact.name);
                      setAddress(contact.address);
                      setError("");
                      setNotice("");
                      nameInput.current?.focus();
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="contacts-remove-button font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--negative)]"
                    type="button"
                    onClick={() => setRemoving(contact.id)}
                  >
                    Remove
                  </button>
                </div>

                {removing === contact.id && (
                  <div className="contacts-remove-confirmation mt-3 flex flex-wrap items-center gap-4 border-l-2 border-[var(--negative)] bg-[var(--negative)]/8 px-3 py-2.5">
                    <span className="contacts-remove-prompt text-[12px] text-[var(--negative)]">Remove {contact.name}?</span>
                    <button
                      className="contacts-confirm-remove font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--negative)]"
                      type="button"
                      onClick={() => {
                        remove(contact.id);
                        setRemoving(undefined);
                        if (editing === contact.id) reset();
                        setNotice("Contact removed.");
                      }}
                    >
                      Confirm removal
                    </button>
                    <button
                      className="contacts-cancel-remove font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      type="button"
                      onClick={() => setRemoving(undefined)}
                    >
                      Keep contact
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
