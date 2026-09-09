# Bảng tra class giao diện

Các class có tên theo chức năng, dùng chữ thường và dấu gạch ngang đơn (kebab-case), không dùng dấu gạch ngang kép hoặc gạch dưới kép. Class Tailwind hiện có vẫn được giữ để duy trì giao diện.

## Cách chỉnh CSS

Thêm quy tắc vào cuối `src/app/globals.css`. Quy tắc ngoài `@layer` sẽ ưu tiên hơn utility Tailwind thông thường nằm trong layer; không cần dùng `!important` cho các trường hợp này.

```css
.payment-studio-amount-input {
  font-size: 2rem;
}

.payment-studio-pay-button {
  border-radius: 8px;
}

.assistant-send-button {
  min-width: 44px;
}

.dashboard-sidebar-nav-link[aria-current="page"] {
  font-weight: 700;
}
```

Class dùng chung như `ui-button-root`, `ui-card-root` và `terminal-panel` áp dụng cho mọi instance. Dùng class chức năng như `payment-studio-pay-button` để chỉnh riêng một thao tác. Các phần tử lặp trong danh sách dùng chung class, không thêm số thứ tự. Có thể kết hợp selector cha để giới hạn phạm vi.

Các tên bên dưới dành cho giao diện do source này render. Nội dung ví do RainbowKit render và chi tiết vẽ trong canvas không có class riêng theo từng đối tượng.

## Danh sách theo file

Các class mới cho việc chia sẻ địa chỉ ví và hiển thị dữ liệu RPC của trợ lý nằm trong [hướng dẫn Payment assistant](payment-assistant.md#css-classes).

### [app/layout.tsx](../src/app/layout.tsx)

- `app-document`
- `app-head`
- `app-body`

### [app/checkout/loading.tsx](../src/app/checkout/loading.tsx)

- `checkout-loading-root`
- `checkout-loading-main`
- `checkout-loading-content`
- `checkout-loading-status`
- `checkout-loading-heading`
- `checkout-loading-grid`
- `checkout-loading-form`
- `checkout-loading-fields`
- `checkout-loading-aside`
- `checkout-loading-pulse`
- `checkout-loading-preview`
- `checkout-loading-bar`

### [app/checkout/page.tsx](../src/app/checkout/page.tsx)

- `checkout-page`
- `checkout-main`

### [app/history/page.tsx](../src/app/history/page.tsx)

- `history-page`
- `history-heading`
- `history-eyebrow`
- `history-title`
- `history-description`

### [app/settings/page.tsx](../src/app/settings/page.tsx)

- `settings-page`

### [components/assistant/AssistantWidget.tsx](../src/components/assistant/AssistantWidget.tsx)

- `assistant-launcher`
- `assistant-launcher-visual`
- `assistant-panel`
- `assistant-header`
- `assistant-title`
- `assistant-close-button`
- `assistant-conversation`
- `assistant-welcome`
- `assistant-introduction`
- `assistant-suggestions-label`
- `assistant-suggestions`
- `assistant-suggestion-button`
- `assistant-messages`
- `assistant-message`
- `assistant-message-role`
- `assistant-message-content`
- `assistant-typing-indicator`
- `assistant-error`
- `assistant-form`
- `assistant-composer`
- `assistant-input`
- `assistant-stop-button`
- `assistant-send-button`
- `assistant-disclaimer`

### [components/chaos/AnimatedTabs.tsx](../src/components/chaos/AnimatedTabs.tsx)

- `animated-tabs-list`
- `animated-tabs-indicator`
- `animated-tabs-tab`
- `animated-tabs-content`

### [components/chaos/ChaosSphere.tsx](../src/components/chaos/ChaosSphere.tsx)

- `chaos-sphere-container`
- `chaos-sphere-canvas`

### [components/chaos/DotGrid.tsx](../src/components/chaos/DotGrid.tsx)

- `dot-grid-container`

### [components/chaos/GlowBorder.tsx](../src/components/chaos/GlowBorder.tsx)

- `glow-border-container`
- `glow-border-highlight`

### [components/chaos/ProgressBar.tsx](../src/components/chaos/ProgressBar.tsx)

- `progress-bar-track`
- `progress-bar-fill`

### [components/chaos/Skeleton.tsx](../src/components/chaos/Skeleton.tsx)

- `ui-skeleton-block`

### [components/chaos/SplashCursor.tsx](../src/components/chaos/SplashCursor.tsx)

- `splash-cursor-container`
- `splash-cursor-canvas`

### [components/chaos/SpotlightCard.tsx](../src/components/chaos/SpotlightCard.tsx)

- `spotlight-card-surface`
- `spotlight-card-highlight`
- `spotlight-card-wrapper`

### [components/chaos/Terminal.tsx](../src/components/chaos/Terminal.tsx)

- `terminal-panel`
- `terminal-panel-header`
- `terminal-panel-title`
- `terminal-panel-meta`
- `terminal-panel-body`
- `terminal-label`
- `terminal-metric`
- `terminal-metric-label`
- `terminal-metric-value`
- `terminal-number`
- `terminal-divider`
- `terminal-trace-row`
- `terminal-trace-index`
- `terminal-trace-label`
- `terminal-trace-detail`
- `terminal-chip`
- `terminal-status-dot`

### [components/landing/ArcHome.tsx](../src/components/landing/ArcHome.tsx)

- `landing-page`
- `landing-background`
- `landing-meta-bar`
- `landing-meta-container`
- `landing-meta-labels`
- `landing-network-label`
- `landing-meta-separator`
- `landing-custody-label`
- `landing-network-stats`
- `landing-hero`
- `landing-hero-container`
- `landing-hero-copy`
- `landing-hero-eyebrow`
- `landing-hero-title`
- `landing-hero-title-secondary`
- `landing-hero-description`
- `landing-settlement-card`
- `landing-settlement-header`
- `landing-settlement-title`
- `landing-settlement-step-count`
- `landing-hero-actions`
- `landing-workspace-link`
- `landing-request-link`
- `landing-benefits`
- `landing-signup-chip`
- `landing-wallet-chip`
- `landing-testnet-chip`
- `landing-pulse-column`
- `landing-pulse-header`
- `landing-pulse-title`
- `landing-pulse-caption`
- `landing-pulse-visual`
- `landing-pulse-button`
- `landing-pulse-stats`
- `landing-capabilities`
- `landing-capabilities-container`
- `landing-capabilities-heading`
- `landing-capabilities-eyebrow`
- `landing-capabilities-title`
- `landing-capabilities-grid`
- `landing-capability`
- `landing-capability-header`
- `landing-capability-number`
- `landing-capability-meta`
- `landing-capability-title`
- `landing-capability-description`
- `landing-details`
- `landing-details-grid`
- `landing-network-panel`
- `landing-network-links`
- `landing-faucet-link`
- `landing-explorer-link`
- `landing-limits-panel`
- `landing-meta-cell`
- `landing-meta-cell-label`
- `landing-meta-cell-value`
- `landing-meta-cell-note`
- `landing-constant-row`
- `landing-constant-label`
- `landing-constant-value`
- `landing-limit-row`
- `landing-receipt-preview`
- `landing-receipt-card`
- `landing-receipt-header`
- `landing-receipt-label`
- `landing-receipt-reference`
- `landing-receipt-amount-block`
- `landing-receipt-amount-label`
- `landing-receipt-amount`
- `landing-receipt-currency`
- `landing-receipt-edge`
- `landing-receipt-details`
- `landing-receipt-divider`
- `landing-receipt-footer`
- `landing-receipt-line`
- `landing-receipt-line-label`
- `landing-receipt-line-value`

### [components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx)

- `app-shell-root`
- `app-shell-layout`
- `app-shell-column`
- `app-shell-main`
- `app-shell-content`

### [components/layout/DashboardSidebar.tsx](../src/components/layout/DashboardSidebar.tsx)

- `dashboard-sidebar-root`
- `dashboard-sidebar-brand`
- `dashboard-sidebar-brand-mark`
- `dashboard-sidebar-brand-text`
- `dashboard-sidebar-brand-name`
- `dashboard-sidebar-nav`
- `dashboard-sidebar-nav-label`
- `dashboard-sidebar-nav-link`
- `dashboard-sidebar-nav-link-label`
- `dashboard-sidebar-faucet-card`
- `dashboard-sidebar-faucet-title`
- `dashboard-sidebar-faucet-description`
- `dashboard-sidebar-faucet-link`
- `dashboard-sidebar-footer`
- `dashboard-sidebar-settings-link`
- `dashboard-sidebar-collapse-button`

### [components/layout/Footer.tsx](../src/components/layout/Footer.tsx)

- `site-footer-root`
- `site-footer-content`
- `site-footer-brand-column`
- `site-footer-brand`
- `site-footer-brand-mark`
- `site-footer-brand-name`
- `site-footer-description`
- `site-footer-internal-link`
- `site-footer-external-link`
- `site-footer-stack`
- `site-footer-stack-title`
- `site-footer-stack-list`
- `site-footer-stack-row`
- `site-footer-stack-label`
- `site-footer-stack-value`
- `site-footer-bottom`
- `site-footer-copyright`
- `site-footer-reminder`
- `site-footer-column`
- `site-footer-column-title`
- `site-footer-column-links`

### [components/layout/MobileNav.tsx](../src/components/layout/MobileNav.tsx)

- `mobile-nav-root`
- `mobile-nav-list`
- `mobile-nav-link`

### [components/layout/Sidebar.tsx](../src/components/layout/Sidebar.tsx)

- `sidebar-root`
- `sidebar-content`
- `sidebar-brand`
- `sidebar-brand-icon`
- `sidebar-brand-copy`
- `sidebar-brand-name`
- `sidebar-brand-description`
- `sidebar-nav`
- `sidebar-nav-link`
- `sidebar-routing-card`
- `sidebar-routing-header`
- `sidebar-routing-icon`
- `sidebar-routing-copy`
- `sidebar-routing-title`
- `sidebar-routing-description`
- `sidebar-routing-details`
- `sidebar-router-label`
- `sidebar-router-value`
- `sidebar-routing-progress`
- `sidebar-routing-progress-fill`
- `page-title-heading`
- `page-title-text`
- `page-title-description`

### [components/layout/TopBar.tsx](../src/components/layout/TopBar.tsx)

- `top-bar-root`
- `top-bar-container`
- `top-bar-branding`
- `top-bar-brand`
- `top-bar-brand-mark`
- `top-bar-brand-name`
- `top-bar-nav`
- `top-bar-nav-link`
- `top-bar-actions`
- `top-bar-network-label`
- `top-bar-theme-button`
- `top-bar-settings-link`
- `top-bar-wallet-loading`
- `top-bar-connect-button`
- `top-bar-connect-label-desktop`
- `top-bar-connect-label-mobile`
- `top-bar-wallet-controls`
- `top-bar-network-button`
- `top-bar-account-button`
- `top-bar-chain-icon`
- `top-bar-chain-image`
- `top-bar-chain-fallback`

### [components/payments/PaymentActivity.tsx](../src/components/payments/PaymentActivity.tsx)

- `payment-activity-panel`
- `payment-activity-view-all-link`
- `payment-activity-storage-notice`
- `payment-activity-status-notice`
- `payment-activity-empty-state`
- `payment-activity-empty-title`
- `payment-activity-empty-description`
- `payment-activity-send-link`
- `payment-activity-list`
- `payment-activity-item`
- `payment-activity-item-details`
- `payment-activity-item-title`
- `payment-activity-recipient`
- `payment-activity-metadata`
- `payment-activity-item-actions`
- `payment-activity-explorer-link`
- `payment-activity-receipt-button`
- `payment-activity-record-button`
- `payment-activity-check-button`
- `payment-activity-amount-group`
- `payment-activity-amount-content`
- `payment-activity-amount`
- `payment-activity-status-wrapper`
- `payment-activity-status`
- `payment-activity-footer`
- `payment-activity-storage-limit`

### [components/payments/PaymentQr.tsx](../src/components/payments/PaymentQr.tsx)

- `payment-qr-error`
- `payment-qr-placeholder`
- `payment-qr-code`
- `payment-qr-background`
- `payment-qr-logo-background`
- `payment-qr-logo`

### [components/payments/PaymentReceipt.tsx](../src/components/payments/PaymentReceipt.tsx)

- `payment-receipt-overlay`
- `payment-receipt-container`
- `payment-receipt-actions`
- `payment-receipt-print-button`
- `payment-receipt-close-button`
- `payment-receipt-sheet`
- `payment-receipt-header`
- `payment-receipt-brand`
- `payment-receipt-brand-mark`
- `payment-receipt-brand-name`
- `payment-receipt-heading`
- `payment-receipt-title`
- `payment-receipt-status`
- `payment-receipt-metadata`
- `payment-receipt-parties`
- `payment-receipt-table`
- `payment-receipt-table-head`
- `payment-receipt-heading-row`
- `payment-receipt-description-heading`
- `payment-receipt-amount-heading`
- `payment-receipt-table-body`
- `payment-receipt-payment-row`
- `payment-receipt-description`
- `payment-receipt-amount`
- `payment-receipt-fee-row`
- `payment-receipt-fee-label`
- `payment-receipt-fee`
- `payment-receipt-table-foot`
- `payment-receipt-total-row`
- `payment-receipt-total-label`
- `payment-receipt-total`
- `payment-receipt-transaction`
- `payment-receipt-hash-label`
- `payment-receipt-hash`
- `payment-receipt-explorer-label`
- `payment-receipt-explorer-url`
- `payment-receipt-footer`
- `payment-receipt-verification-note`
- `payment-receipt-testnet-note`
- `payment-receipt-meta-item`
- `payment-receipt-meta-label`
- `payment-receipt-meta-value`
- `payment-receipt-party`
- `payment-receipt-party-label`
- `payment-receipt-party-address`

### [components/payments/PaymentStudio.tsx](../src/components/payments/PaymentStudio.tsx)

- `payment-studio-summary-header`
- `payment-studio-summary-heading`
- `payment-studio-summary-title`
- `payment-studio-summary-description`
- `payment-studio-summary-chip`
- `payment-studio-summary-amount-block`
- `payment-studio-summary-amount-label`
- `payment-studio-summary-amount`
- `payment-studio-summary-amount-value`
- `payment-studio-summary-currency`
- `payment-studio-summary-details`
- `payment-studio-summary-divider`
- `payment-studio-summary-notice`
- `payment-studio-fields-header`
- `payment-studio-fields-heading`
- `payment-studio-fields-title`
- `payment-studio-fields-description`
- `payment-studio-mode-chip`
- `payment-studio-fields`
- `payment-studio-recipient-input`
- `payment-studio-amount-field`
- `payment-studio-amount-input`
- `payment-studio-amount-icon`
- `payment-studio-currency`
- `payment-studio-quick-amounts`
- `payment-studio-quick-amount-button`
- `payment-studio-details-section`
- `payment-studio-details-toggle`
- `payment-studio-details-toggle-label`
- `payment-studio-details-toggle-content`
- `payment-studio-details-preview`
- `payment-studio-details-fields`
- `payment-studio-memo-input`
- `payment-studio-reference-input`
- `payment-studio-receipt-header`
- `payment-studio-receipt-heading`
- `payment-studio-receipt-title`
- `payment-studio-receipt-network`
- `payment-studio-receipt-status`
- `payment-studio-receipt-amount`
- `payment-studio-receipt-amount-value`
- `payment-studio-receipt-currency`
- `payment-studio-receipt-details`
- `payment-studio-receipt-divider`
- `payment-studio-receipt-totals`
- `payment-studio-progress`
- `payment-studio-progress-message`
- `payment-studio-review-notice`
- `payment-studio-form`
- `payment-studio-error`
- `payment-studio-actions`
- `payment-studio-create-request-button`
- `payment-studio-summary-connect-button`
- `payment-studio-summary-review-button`
- `payment-studio-edit-details-button`
- `payment-studio-connect-button`
- `payment-studio-review-button`
- `payment-studio-pay-button`
- `payment-studio-edit-payment-button`
- `payment-studio-recheck-button`
- `payment-studio-new-payment-button`
- `payment-studio-send-again-button`
- `payment-studio-explorer-link`
- `payment-studio-mobile-checkout`
- `payment-studio-mobile-checkout-copy`
- `payment-studio-mobile-checkout-title`
- `payment-studio-mobile-checkout-description`
- `payment-studio-share-result`
- `payment-studio-share-title`
- `payment-studio-share-link-field`
- `payment-studio-share-link-label`
- `payment-studio-share-link-input`
- `payment-studio-share-actions`
- `payment-studio-share-notice`
- `payment-studio-root`
- `payment-studio-header`
- `payment-studio-heading`
- `payment-studio-eyebrow`
- `payment-studio-title`
- `payment-studio-description`
- `payment-studio-activity-link`
- `payment-studio-layout`
- `payment-studio-form-card`
- `payment-studio-aside`
- `payment-studio-preview-panel`
- `payment-studio-preview-amount-block`
- `payment-studio-preview-amount-label`
- `payment-studio-preview-amount`
- `payment-studio-preview-currency`
- `payment-studio-preview-edge`
- `payment-studio-preview-details`
- `payment-studio-preview-divider`
- `payment-studio-preview-totals`
- `payment-studio-preview-total-divider`
- `payment-studio-testnet-notice`
- `payment-studio-field`
- `payment-studio-field-label`
- `payment-studio-field-error`
- `payment-studio-field-hint`
- `payment-studio-receipt-row`
- `payment-studio-receipt-row-label`
- `payment-studio-receipt-row-value`
- `payment-studio-total-row`
- `payment-studio-total-label`
- `payment-studio-total-value`

### [components/payments/SavedRequests.tsx](../src/components/payments/SavedRequests.tsx)

- `saved-requests-root`
- `saved-requests-panel`
- `saved-requests-storage-notice`
- `saved-requests-empty-state`
- `saved-requests-list`
- `saved-requests-item`
- `saved-requests-item-header`
- `saved-requests-item-details`
- `saved-requests-item-title`
- `saved-requests-recipient`
- `saved-requests-metadata`
- `saved-requests-amount-group`
- `saved-requests-checkout-link`
- `saved-requests-amount`
- `saved-requests-share-actions`

### [components/payments/SettlementPulse.tsx](../src/components/payments/SettlementPulse.tsx)

- `settlement-pulse-panel`
- `settlement-pulse-visual`
- `settlement-pulse-stats`
- `settlement-stat`
- `settlement-stat-label`
- `settlement-stat-value`
- `settlement-stat-note`
- `settlement-path-panel`
- `settlement-path-fee`
- `settlement-transaction`
- `settlement-transaction-label`
- `settlement-transaction-hash`

### [components/payments/ShareActions.tsx](../src/components/payments/ShareActions.tsx)

- `share-actions-root`
- `share-actions-buttons`
- `share-actions-copy-button`
- `share-actions-qr-button`
- `share-actions-share-button`
- `share-actions-preview-link`
- `share-actions-qr-panel`
- `share-actions-qr-hint`

### [components/payments/WorkspaceOverview.tsx](../src/components/payments/WorkspaceOverview.tsx)

- `workspace-root`
- `workspace-header`
- `workspace-heading`
- `workspace-eyebrow`
- `workspace-title`
- `workspace-description`
- `workspace-network-chip`
- `workspace-layout`
- `workspace-main`
- `workspace-balance-panel`
- `workspace-balance-content`
- `workspace-balance-amount-group`
- `workspace-balance-amount`
- `workspace-balance-loading`
- `workspace-balance-currency`
- `workspace-wallet-address`
- `workspace-wallet-actions`
- `workspace-connect-wrapper`
- `workspace-connect-button`
- `workspace-send-link`
- `workspace-request-link`
- `workspace-metrics`
- `workspace-aside`
- `workspace-onboarding-panel`
- `workspace-faucet-link`
- `workspace-testnet-notice`
- `workspace-next-payment-link`
- `workspace-next-payment-label`
- `workspace-next-payment-title`
- `workspace-metric-content`
- `workspace-metric-copy`
- `workspace-metric-label`
- `workspace-metric-amount`
- `workspace-metric-value`
- `workspace-metric-note`
- `workspace-metric-link`

### [components/settings/SettingsPanel.tsx](../src/components/settings/SettingsPanel.tsx)

- `settings-panel`
- `settings-intro-card`
- `settings-intro-content`
- `settings-intro-copy`
- `settings-intro-title`
- `settings-intro-description`
- `settings-summary`
- `settings-columns`
- `settings-execution-column`
- `settings-execution-card`
- `settings-reset-button`
- `settings-execution-fields`
- `settings-slippage-field`
- `settings-slippage-controls`
- `settings-slippage-input`
- `settings-safety-card`
- `settings-safety-content`
- `settings-expert-warning`
- `settings-preferences-column`
- `settings-network-card`
- `settings-network-fields`
- `settings-chain-select`
- `settings-chain-option`
- `settings-rpc-section`
- `settings-rpc-heading`
- `settings-rpc-copy`
- `settings-rpc-title`
- `settings-rpc-description`
- `settings-rpc-input`
- `settings-network-summary`
- `settings-appearance-card`
- `settings-appearance-fields`
- `settings-theme-buttons`
- `settings-light-button`
- `settings-dark-button`
- `settings-summary-item`
- `settings-summary-label`
- `settings-summary-value`
- `settings-control-row`
- `settings-control-heading`
- `settings-control-copy`
- `settings-control-title`
- `settings-control-description`
- `settings-control-inputs`
- `settings-option-row`
- `settings-option-heading`
- `settings-option-copy`
- `settings-option-title`
- `settings-option-description`
- `settings-segmented-control`
- `settings-segmented-option`
- `settings-toggle`
- `settings-toggle-thumb`
- `settings-network-stat`
- `settings-network-stat-label`
- `settings-network-stat-value`

### [components/ui/Badge.tsx](../src/components/ui/Badge.tsx)

- `ui-badge-root`

### [components/ui/Button.tsx](../src/components/ui/Button.tsx)

- `ui-button-root`

### [components/ui/Card.tsx](../src/components/ui/Card.tsx)

- `ui-card-root`
- `ui-card-header`
- `ui-card-heading`
- `ui-card-title`
- `ui-card-subtitle`

### [components/ui/ConnectWalletButton.tsx](../src/components/ui/ConnectWalletButton.tsx)

- `wallet-button-loading`
- `wallet-button-account`
- `wallet-button-connect`

### [components/ui/PageLoading.tsx](../src/components/ui/PageLoading.tsx)

- `page-loading-heading`
- `page-loading-content`
- `page-loading-grid`
- `page-loading-main-card`
- `page-loading-summary-label`
- `page-loading-summary-value`
- `page-loading-metrics`
- `page-loading-secondary-card`
- `page-loading-secondary-title`
- `page-loading-fields`
- `page-loading-table-card`
- `page-loading-table-toolbar`
- `page-loading-search-placeholder`
- `page-loading-rows`
- `page-loading-row`
- `page-loading-row-primary`
- `page-loading-row-secondary`
- `page-loading-skeleton`

### [components/ui/Toast.tsx](../src/components/ui/Toast.tsx)

- `toast-viewport`
- `toast-item`
- `toast-content`
- `toast-title`
- `toast-description`
- `toast-dismiss-button`

### [components/ui/TokenAvatar.tsx](../src/components/ui/TokenAvatar.tsx)

- `token-avatar-image`
- `token-avatar-fallback`
- `token-avatar-root`
