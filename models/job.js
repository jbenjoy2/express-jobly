'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

class Job {
	/** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equiry, companyHandle }
   *
   * */

	static async create({ title, salary, equity, companyHandle }) {
		const result = await db.query(
			`
            INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"
        `,
			[ title, salary, equity, companyHandle ]
		);
		let job = result.rows[0];
		return job;
	}

	/** Find all jobs with optional filter in query string
    * 
    * filterOptions will default to an empty object (all options are 'undefined'; data will be validated on route)
    * 
    * 
    * filtering can be done using job title, minSalary, and hasEquity
    * 
    * filter options:
    * title: string- find companies with this job title case-insensitive; any job with title containing this string (use ILIKE %<string>%)
    * minSalary: integer- find companies with this salary or higher
    * hasEquity: boolean; true returns jobs with equity > 0, otherwise ignored
    * 
    * 
    *
    * Returns [{id, title, salary, equity, companyHandle, companyName }, ...]
    * */

	static async findAll(filterOptions = {}) {
		let mainQuery = `SELECT j.id, j.title, j.salary, j.equity, j.company_handle as "companyHandle", c.name AS "companyName"
        FROM jobs j 
        LEFT JOIN companies AS c
        ON c.handle = j.company_handle `;

		// make WHERE statements for filter
		let whereStatements = [];
		// values for the "WHERE statements"
		let whereValues = [];

		const { title, minSalary, hasEquity } = filterOptions;

		// generate where statements for each filter option if present
		// not else if statements since they are independent of each other
		if (minSalary !== undefined) {
			whereValues.push(minSalary);
			whereStatements.push(`salary >= $${whereValues.length}`);
		}

		if (hasEquity === true) {
			whereStatements.push(`equity > 0`);
		}

		if (title !== undefined) {
			whereValues.push(`%${title}%`);
			whereStatements.push(`title ILIKE $${whereValues.length}`);
		}

		// add where expressions to query if there are any to add:
		if (whereStatements.length > 0) {
			const wheresToAdd = whereStatements.join(' AND ');
			mainQuery += ` WHERE ${wheresToAdd} `;
		}

		// add in the 'order by' statement from original query
		mainQuery += `ORDER BY title`;
		// ping the database and get the matching values back

		const jobs = await db.query(mainQuery, whereValues);

		return jobs.rows;
	}
	/** Given a job id, return data about that job.
   *
   * Returns { id, title, salary, equity, company  }
   *   where company is { handle, name, description, numEmploeyes, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

	static async get(id) {
		const jobRes = await db.query(
			`SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
			[ id ]
		);

		const job = jobRes.rows[0];

		if (!job) throw new NotFoundError(`No job: ${id}`);
		const companyRes = await db.query(
			`SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
            FROM companies
            WHERE handle = $1`,
			[ job.companyHandle ]
		);
		delete job.companyHandle;
		job.company = companyRes.rows[0];

		return job;
	}

	/** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
   *
   * Throws NotFoundError if job not found.
   */

	static async update(id, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {});
		const idVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE jobs
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
		const result = await db.query(querySql, [ ...values, id ]);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`Job not found: ${id}`);

		return job;
	}

	/** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

	static async remove(id) {
		const result = await db.query(
			`DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
			[ id ]
		);
		const job = result.rows[0];

		if (!job) throw new NotFoundError(`No job: ${id}`);
	}
}

module.exports = Job;
