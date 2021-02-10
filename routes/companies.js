'use strict';

/** Routes for companies. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureLoggedIn, ensureIsAdmin } = require('../middleware/auth');
const Company = require('../models/company');

const companyNewSchema = require('../schemas/companyNew.json');
const companyUpdateSchema = require('../schemas/companyUpdate.json');
const companySearchSchema = require('../schemas/companySearch.json');

const router = new express.Router();

/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 */

router.post('/', ensureIsAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, companyNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const company = await Company.create(req.body);
		return res.status(201).json({ company });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get('/', async function(req, res, next) {
	// get filter options from query string
	const filters = req.query;
	// convert string form of employee filters to numbers, if they exist
	if (filters.minEmployees !== undefined) filters.minEmployees = +filters.minEmployees;

	if (filters.maxEmployees !== undefined) filters.maxEmployees = +filters.maxEmployees;

	// validate the info against the company search schema; if not validated, throw error
	try {
		const result = jsonschema.validate(filters, companySearchSchema);
		if (!result.valid) {
			let listOfErrors = result.errors.map((e) => e.stack);
			throw new BadRequestError(listOfErrors);
		}

		// use model method to query db with applied filters and return the companies object
		const companies = await Company.findAll(filters);
		return res.json({ companies });
	} catch (err) {
		return next(err);
	}
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get('/:handle', async function(req, res, next) {
	try {
		const company = await Company.get(req.params.handle);

		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: admin
 */

router.patch('/:handle', ensureIsAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, companyUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const company = await Company.update(req.params.handle, req.body);
		return res.json({ company });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: admin
 */

router.delete('/:handle', ensureIsAdmin, async function(req, res, next) {
	try {
		await Company.remove(req.params.handle);
		return res.json({ deleted: req.params.handle });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
