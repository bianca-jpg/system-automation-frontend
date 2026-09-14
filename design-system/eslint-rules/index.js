/**
 * @fileoverview ds plugin entrypoint — exposes 4 custom ESLint rules
 *               (D-uc-02, D-cva-02, D-cva-03, D-form-01+02).
 *
 *               Phase 34: 3 rules instalados em warn-mode (D-uc-02 + D-cva-02 + D-cva-03).
 *               Phase 35 (Plan 35-6): 4ª rule `no-form-frankenstein` adicionada em warn-mode
 *               (covers BOTH FormInput AND FormSelect — D-form-01 + D-form-02).
 *               Phase 38 (FE-QUAL-06/21): all rules promoted to error-mode.
 *
 *               Plan 38-2 Task 2: relocated from packages/design-system/eslint-rules/
 *               to packages/eslint-config/eslint-rules/. Consumed by DS via
 *               @system-automation/eslint-config/ds and by apps via @system-automation/eslint-config/next-app.
 *
 * @author DS Team — Phase 34 DS Foundation (rules 1-3); Phase 35 Plan 6 (rule 4);
 *                     Phase 38 Plan 38-2 (relocation to shared workspace package)
 */

const noUseClientInBarrel = require("./no-use-client-in-barrel");
const cvaMaxAxes = require("./cva-max-axes");
const cvaMaxCompoundVariants = require("./cva-max-compound-variants");
const noFormFrankenstein = require("./no-form-frankenstein"); // NEW — Plan 35-6 / D-form-01 + D-form-02 (covers FormInput AND FormSelect)

module.exports = {
  rules: {
    "no-use-client-in-barrel": noUseClientInBarrel,
    "cva-max-axes": cvaMaxAxes,
    "cva-max-compound-variants": cvaMaxCompoundVariants,
    "no-form-frankenstein": noFormFrankenstein, // NEW — Plan 35-6 / D-form-01 + D-form-02
  },
};
