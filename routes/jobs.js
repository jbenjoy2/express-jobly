'use strict';

/** Routes for companies. */

const jsonschema = require('jsonschema');
const express = require('express');

const { BadRequestError } = require('../expressError');
const { ensureIsAdmin } = require('../middleware/auth');
const Job = require('../models/job');

const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json');
const jobSearchSchema = require('../schemas/jobSearch.json');

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * company should be {title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.post('/', ensureIsAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.create(req.body);
		return res.status(201).json({ job });
	} catch (err) {
		return next(err);
	}
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - minSalary
 * - hasEquity
 * - title (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get('/', async function(req, res, next) {
	// // get filter options from query string
	const filters = req.query;
	// convert string form of salary filter to number, if present
	if (filters.minSalary !== undefined) filters.minSalary = +filters.minSalary;
	// check if hasEquity filter is equal to string form of 'true'. If so, set boolean of true to hasEquity, otherwise, set to false
	filters.hasEquity = filters.hasEquity === 'true';

	// validate the info against the job search schema; if not validated, throw error
	try {
		const result = jsonschema.validate(filters, jobSearchSchema);
		if (!result.valid) {
			let listOfErrors = result.errors.map((e) => e.stack);
			throw new BadRequestError(listOfErrors);
		}

		// use model method to query db with applied filters and return the jobs object
		const jobs = await Job.findAll(filters);
		return res.json({ jobs });
	} catch (err) {
		return next(err);
	}
});

/** GET /[id]  =>  { job }
 *
 *  job is { id, title, salary, equity, company }
 *   where jobs is {handle, name, description, numEmployees, logoUrl}
 *
 * Authorization required: none
 */

router.get('/:id', async function(req, res, next) {
	try {
		const job = await Job.get(req.params.id);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: admin
 */

router.patch('/:id', ensureIsAdmin, async function(req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.update(req.params.id, req.body);
		return res.json({ job });
	} catch (err) {
		return next(err);
	}
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: admin
 */

router.delete('/:id', ensureIsAdmin, async function(req, res, next) {
	try {
		await Job.remove(req.params.id);
		return res.json({ deleted: req.params.id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
