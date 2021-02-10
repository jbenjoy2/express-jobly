'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

	static async create({ handle, name, description, numEmployees, logoUrl }) {
		const duplicateCheck = await db.query(
			`SELECT handle
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		if (duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate company: ${handle}`);

		const result = await db.query(
			`INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
			[ handle, name, description, numEmployees, logoUrl ]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies with optional filter in query string
   * 
   * filterOptions will default to an empty object (all options are 'undefined'; data will be validated on route)
   * 
   * 
   * filtering can be done using company name, minEmployees, and maxEmployees; minEmployees must not be greater than maxEmployees
   * 
   * filter options:
   * minEmployees: integer- find companies with this numEmployees or greater
   * maxEmployees: integer- find companies with this numEmployees or fewer
   * name: string- case-insensitive; any company with name containing this string (use ILIKE %<string>%)
   * 
   * 
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

	static async findAll(filterOptions = {}) {
		let mainQuery = `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           `;

		let whereStatements = [];
		let whereValues = [];

		const { minEmployees, maxEmployees, name } = filterOptions;
		// error handling for min > max:
		if (minEmployees > maxEmployees) {
			throw new BadRequestError(
				'Minimum number of employees must not be greater than maximum!'
			);
		}

		// generate where statements for each filter option if present
		// not else if statements since they are independent of each other
		if (minEmployees !== undefined) {
			whereValues.push(minEmployees);
			whereStatements.push(`num_employees >= $${whereValues.length}`);
		}

		if (maxEmployees !== undefined) {
			whereValues.push(maxEmployees);
			whereStatements.push(`num_employees <= $${whereValues.length}`);
		}

		if (name) {
			whereValues.push(`%${name}%`);
			whereStatements.push(`name ILIKE $${whereValues.length}`);
		}

		// add where expressions to query if there are any to add:
		if (whereStatements.length > 0) {
			const wheresToAdd = whereStatements.join(' AND ');
			mainQuery += ` WHERE ${wheresToAdd}`;
		}

		// add in the 'order by' statement from original query
		mainQuery += `ORDER BY name`;
		// ping the database and get the matching values back
		const companies = await db.query(mainQuery, whereValues);

		return companies.rows;
	}

	/** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

	static async get(handle) {
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[ handle ]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		// find jobs associated with given company

		const jobRes = await db.query(
			`
			SELECT  id,
					title, 
					salary,
					equity
			FROM jobs
			WHERE company_handle = $1
			ORDER BY id
			`,
			[ handle ]
		);

		company.jobs = jobRes.rows;
		return company;
	}

	/** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

	static async update(handle, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			numEmployees : 'num_employees',
			logoUrl      : 'logo_url'
		});
		const handleVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
		const result = await db.query(querySql, [ ...values, handle ]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

	static async remove(handle) {
		const result = await db.query(
			`DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
			[ handle ]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);
	}
}

module.exports = Company;
