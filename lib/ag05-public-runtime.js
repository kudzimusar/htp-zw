'use strict';

/**
 * Phase 3 compatibility entry point for the accepted AG-05 public runtime lineage.
 *
 * The CP5 version of this path rendered the superseded root HealthTimes HTML UI.
 * Phase 3 intentionally does not recover that presentation. Consumers receive
 * presentation-neutral capability functions from ag05-capability instead.
 */
module.exports = require('./ag05-capability');
