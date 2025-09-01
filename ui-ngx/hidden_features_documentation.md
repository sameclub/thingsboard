# Hidden Features Documentation

This document records the UI elements that have been hidden by commenting out code. 
To re-enable a feature, find the corresponding file and uncomment the code block.

## 1. Device List Page

**File:** `src/app/modules/home/pages/device/devices-table-config.resolver.ts`

- **Hidden Columns:** `customerTitle`, `customerIsPublic` (Public), `gateway` (Is gateway).
  - **To Re-enable:** Uncomment the `if (deviceScope === 'tenant')` block and the subsequent `columns.push` for the gateway in the `configureColumns` method.

- **Hidden Cell Actions:** `make-public`, `assign-to-customer`, `unassign-from-customer`, `make-private`.
  - **To Re-enable:** Uncomment the corresponding action objects inside the `actions.push` array in the `configureCellActions` method for `deviceScope === 'tenant'` and `deviceScope === 'customer'`.

- **Hidden Group Actions:** `assign-devices`, `unassign-devices`.
  - **To Re-enable:** Uncomment the `actions.push` blocks inside the `configureGroupActions` method for `deviceScope === 'tenant'` and `deviceScope === 'customer'`.

## 2. Device Details Page

**File:** `src/app/modules/home/pages/device/device.component.html`

- **Hidden Buttons:** `make-public`, `assign-to-customer`, `unassign-from-customer` / `make-private`.
- **Hidden Fields:** `assignedToCustomer`, `device-public` text, `is-gateway` toggle.
  - **To Re-enable:** Find the corresponding HTML elements (buttons, form fields, slide toggle) and uncomment them.

**File:** `src/app/modules/home/pages/device/device-tabs.component.html`

- **Hidden Tabs:** `Alarms`, `Events`, `Relations`, `Audit Logs`, `Version Control`.
  - **To Re-enable:** Find the `<mat-tab>` elements with the corresponding labels and uncomment them.

## 3. Device Profile Details Page

**File:** `src/app/modules/home/components/profile/device-profile.component.html`

- **Hidden Fields:** `default-rule-chain`, `mobile-dashboard`, `defaultQueueName` (Queue), `default-edge-rule-chain`.
  - **To Re-enable:** Uncomment the corresponding `tb-rule-chain-autocomplete`, `tb-dashboard-autocomplete`, and `tb-queue-autocomplete` components.

**File:** `src/app/modules/home/pages/device-profile/device-profile-tabs.component.html`

- **Hidden Tabs:** `Alarm Rules`, `Audit Logs`, `Version Control`.
  - **To Re-enable:** Find the `<mat-tab>` elements with the corresponding labels and uncomment them.

## 4. OTA Update Details Page

**File:** `src/app/modules/home/pages/ota-update/ota-update-tabs.component.html`

- **Hidden Tab:** `Version Control`.
  - **To Re-enable:** Uncomment the `<mat-tab>` element for version control.
## 5. Settings Page (`/settings`)

**File:** `src/app/modules/home/pages/admin/admin-routing.module.ts`

- **Hidden Tabs:** `Notifications`, `Queues`.
  - **To Re-enable:** Find the route objects with `path: 'notifications'` and `path: 'queues'` in the `children` array of the `/settings` route and uncomment them.

**File:** `src/app/core/services/menu.models.ts`

- **Hidden Menu Items:** `Notifications`, `Queues` from the Settings menu for SYS_ADMIN.
  - **To Re-enable:** In the `defaultUserMenuMap` for `Authority.SYS_ADMIN`, find the `pages` array for `MenuId.settings` and uncomment the lines for `MenuId.notification_settings` and `MenuId.queues`. Also, uncomment these from the `places` array in `defaultHomeSectionMap` for `SYS_ADMIN`.

## 6. My Account Page (`/account/profile`)

**File:** `src/app/modules/home/pages/account/account-routing.module.ts`

- **Hidden Tab:** `Notification Settings`.
  - **To Re-enable:** Uncomment the line `...notificationUserSettingsRoutes` in the `children` array.

**File:** `src/app/modules/home/pages/security/security.component.html`

- **Hidden Section:** `JWT Token`.
  - **To Re-enable:** Uncomment the `mat-expansion-panel` for `security.jwt-token`.

**File:** `src/app/modules/home/pages/profile/profile.component.html`

- **Hidden Fields:** `Language` settings, `Home dashboard` settings.
  - **To Re-enable:** Uncomment the `mat-form-field` for `language.language` and the `<section>` for `tb-home-dashboard`.

## 7. Authentication

**File:** `src/app/core/auth/auth.service.ts`

- **Disabled Customer Login:** Modified the `setUserFromJwtToken` method to prevent users with the `CUSTOMER_USER` role from logging in.
  - **To Revert:** Revert the `setUserFromJwtToken` method to its original state. The original method simply updates tokens and loads user data without checking the user's role.

## 8. Global Component Changes

**Component:** `tb-phone-input`

**File:** `src/app/shared/components/phone-input.component.ts`

- **Change:** Modified the component to always include the country code and to not show a validation error if only the country code is present.
  - **To Revert:** 
    1. In the `getPhoneNumberData` method, change `this.countryCallingCode = "+${phoneData.countryCallingCode}";` back to `this.countryCallingCode = "+${this.enableFlagsSelect ? phoneData.countryCallingCode : ''}";`.
    2. In the `validatePhoneNumber` method, remove the `&& phoneNumber !== this.countryCallingCode` check.

**File:** `src/app/modules/home/pages/profile/profile.component.html`

- **Change:** Set the default country to China (`+86`) and hid the country selector in the My Account page.
  - **To Revert:** Change `defaultCountry="CN"` to `defaultCountry="US"` and `[enableFlagsSelect]="false"` to `[enableFlagsSelect]="true"` on the `<tb-phone-input>` component.