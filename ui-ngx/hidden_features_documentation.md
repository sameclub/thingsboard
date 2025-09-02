# Hidden Features Documentation

This document records the UI elements that have been hidden by commenting out code. To re-enable a feature, find the corresponding file and uncomment the code block.

## `src/app/core/auth/auth.service.ts`

### Authentication

- **Disabled Customer Login:** Modified the `setUserFromJwtToken` method to prevent users with the `CUSTOMER_USER` role from logging in.
  - **To Revert:** Revert the `setUserFromJwtToken` method to its original state. The original method simply updates tokens and loads user data without checking the user's role.

## `src/app/core/services/menu.models.ts`

### Settings Page (`/settings`)

- **Hidden Menu Items:** `Notifications`, `Queues` from the Settings menu for SYS_ADMIN.
  - **To Re-enable:** In the `defaultUserMenuMap` for `Authority.SYS_ADMIN`, find the `pages` array for `MenuId.settings` and uncomment the lines for `MenuId.notification_settings` and `MenuId.queues`. Also, uncomment these from the `places` array in `defaultHomeSectionMap` for `SYS_ADMIN`.

## `src/app/modules/home/components/profile/add-device-profile-dialog.component.html`

### Add Device Profile Dialog

- **Hidden Fields:** `default-rule-chain`, `mobile-dashboard`, `defaultQueueName` (Queue), `default-edge-rule-chain` (lines 51-70).
  - **To Re-enable:** Uncomment the corresponding `tb-rule-chain-autocomplete`, `tb-dashboard-autocomplete`, and `tb-queue-autocomplete` components.
- **Hidden Section:** `Alarm Rules` (lines 128-137).
  - **To Re-enable:** Uncomment the `mat-step` for `alarmRulesFormGroup`.

## `src/app/modules/home/components/profile/add-device-profile-dialog.component.ts`

### Add Device Profile Dialog

- **Disabled Logic:** Commented out `alarmRulesFormGroup` and related logic, and form controls for hidden fields.
  - **To Re-enable:** 
    - Uncomment the `alarmRulesFormGroup` property (line 93).
    - Uncomment its initialization in the constructor (lines 141-145).
    - Uncomment `case 2` in `selectedForm()` (lines 188-189) and `getFormLabel()` (lines 234-235) methods.
    - Uncomment the `alarms` logic in the `add()` method (line 212) and replace it with the original line.
    - Uncomment the `if` blocks for `defaultRuleChainId`, `defaultDashboardId`, and `defaultEdgeRuleChainId` in the `add()` method (lines 216-224).
    - Uncomment the form controls in `deviceProfileDetailsFormGroup` (lines 121-124).

## `src/app/modules/home/components/profile/device-profile.component.html`

### Device Profile Details Page

- **Hidden Fields:** `default-rule-chain`, `mobile-dashboard`, `defaultQueueName` (Queue), `default-edge-rule-chain`.
  - **To Re-enable:** Uncomment the corresponding `tb-rule-chain-autocomplete`, `tb-dashboard-autocomplete`, and `tb-queue-autocomplete` components.

## `src/app/modules/home/pages/account/account-routing.module.ts`

### My Account Page (`/account/profile`)

- **Hidden Tab:** `Notification Settings`.
  - **To Re-enable:** Uncomment the line `...notificationUserSettingsRoutes` in the `children` array.

## `src/app/modules/home/pages/admin/admin-routing.module.ts`

### Settings Page (`/settings`)

- **Hidden Tabs:** `Notifications`, `Queues`.
  - **To Re-enable:** Find the route objects with `path: 'notifications'` and `path: 'queues'` in the `children` array of the `/settings` route and uncomment them.

## `src/app/modules/home/pages/device/device.component.html`

### Device Details Page

- **Hidden Buttons:** `make-public`, `assign-to-customer`, `unassign-from-customer` / `make-private`.
- **Hidden Fields:** `assignedToCustomer`, `device-public` text, `is-gateway` toggle.
  - **To Re-enable:** Find the corresponding HTML elements (buttons, form fields, slide toggle) and uncomment them.

## `src/app/modules/home/pages/device/device-tabs.component.html`

### Device Details Page

- **Hidden Tabs:** `Alarms`, `Events`, `Relations`, `Audit Logs`, `Version Control`.
  - **To Re-enable:** Find the `<mat-tab>` elements with the corresponding labels and uncomment them.

## `src/app/modules/home/pages/device/devices-table-config.resolver.ts`

### Device List Page

- **Hidden Columns:** `customerTitle`, `customerIsPublic` (Public), `gateway` (Is gateway).
  - **To Re-enable:** Uncomment the `if (deviceScope === 'tenant')` block and the subsequent `columns.push` for the gateway in the `configureColumns` method.
- **Hidden Cell Actions:** `make-public`, `assign-to-customer`, `unassign-from-customer`, `make-private`.
  - **To Re-enable:** Uncomment the corresponding action objects inside the `actions.push` array in the `configureCellActions` method for `deviceScope === 'tenant'` and `deviceScope === 'customer'`.
- **Hidden Group Actions:** `assign-devices`, `unassign-devices`.
  - **To Re-enable:** Uncomment the `actions.push` blocks inside the `configureGroupActions` method for `deviceScope === 'tenant'` and `deviceScope === 'customer'`.

## `src/app/modules/home/pages/device-profile/device-profile-tabs.component.html`

### Device Profile Details Page

- **Hidden Tabs:** `Alarm Rules`, `Audit Logs`, `Version Control`.
  - **To Re-enable:** Find the `<mat-tab>` elements with the corresponding labels and uncomment them.

## `src/app/modules/home/pages/ota-update/ota-update-tabs.component.html`

### OTA Update Details Page

- **Hidden Tab:** `Version Control`.
  - **To Re-enable:** Uncomment the `<mat-tab>` element for version control.

## `src/app/modules/home/pages/profile/profile.component.html`

### My Account Page (`/account/profile`)

- **Hidden Fields:** `Language` settings, `Home dashboard` settings.
  - **To Re-enable:** Uncomment the `mat-form-field` for `language.language` and the `<section>` for `tb-home-dashboard`.

### Global Component Changes (`tb-phone-input`)

- **Change:** Set the default country to China (`+86`) and hid the country selector in the My Account page.
  - **To Revert:** Change `defaultCountry="CN"` to `defaultCountry="US"` and `[enableFlagsSelect]="false"` to `[enableFlagsSelect]="true"` on the `<tb-phone-input>` component.

## `src/app/modules/home/pages/security/security.component.html`

### My Account Page (`/account/profile`)

- **Hidden Section:** `JWT Token`.
  - **To Re-enable:** Uncomment the `mat-expansion-panel` for `security.jwt-token`.

## `src/app/shared/components/phone-input.component.ts`

### Global Component Changes (`tb-phone-input`)

- **Change:** Modified the component to always include the country code and to not show a validation error if only the country code is present.
  - **To Revert:** 
    1. In the `getPhoneNumberData` method, change `this.countryCallingCode = "+${phoneData.countryCallingCode}";` back to `this.countryCallingCode = "+${this.enableFlagsSelect ? phoneData.countryCallingCode : ''}";`.
    2. In the `validatePhoneNumber` method, remove the `&& phoneNumber !== this.countryCallingCode` check.
