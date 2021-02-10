'use strict';

const request = require('supertest');

const db = require('../db');
const app = require('../app');

const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	u1Token,
	adminToken,
	jobIds
} = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe('POST /jobs', function() {
	const newJob = {
		title         : 'newJob',
		salary        : 400,
		equity        : '0.4',
		companyHandle : 'c1'
	};

	test('ok for admin', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send(newJob)
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(201);
		expect(resp.body).toEqual({
			job : {
				id : expect.any(Number),
				...newJob
			}
		});
	});

	test('Unauthorized error if not admin', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send(newJob)
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('bad request with missing data', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send({
				title  : 'new',
				salary : 10
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('bad request with invalid data', async function() {
		const resp = await request(app)
			.post('/jobs')
			.send({
				title         : 'newJob',
				salary        : 'whachaknowaboutdat',
				equity        : '0.3',
				companyHandle : 'c1'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** GET /jobs */

describe('GET /jobs', function() {
	test('ok for anon', async function() {
		const resp = await request(app).get('/jobs');
		expect(resp.body).toEqual({
			jobs : [
				{
					id            : jobIds[0],
					title         : 'test1',
					salary        : 100,
					equity        : '0.1',
					companyHandle : 'c1',
					companyName   : 'C1'
				},
				{
					id            : jobIds[1],
					title         : 'test2',
					salary        : 200,
					equity        : '0.2',
					companyHandle : 'c1',
					companyName   : 'C1'
				},
				{
					id            : jobIds[2],
					title         : 'test3',
					salary        : 300,
					equity        : null,
					companyHandle : 'c1',
					companyName   : 'C1'
				}
			]
		});
	});

	test('works with single filter', async () => {
		const resp = await request(app).get('/jobs').query({ minSalary: 200 });
		expect(resp.body).toEqual({
			jobs : [
				{
					id            : jobIds[1],
					title         : 'test2',
					salary        : 200,
					equity        : '0.2',
					companyHandle : 'c1',
					companyName   : 'C1'
				},
				{
					id            : jobIds[2],
					title         : 'test3',
					salary        : 300,
					equity        : null,
					companyHandle : 'c1',
					companyName   : 'C1'
				}
			]
		});
	});
	test('works with multiple filters', async () => {
		const resp = await request(app)
			.get('/jobs')
			.query({ minSalary: 200, hasEquity: true, title: 'test2' });
		expect(resp.body).toEqual({
			jobs : [
				{
					id            : jobIds[1],
					title         : 'test2',
					salary        : 200,
					equity        : '0.2',
					companyHandle : 'c1',
					companyName   : 'C1'
				}
			]
		});
	});

	test('fails with BadRequestError if query validation fails', async () => {
		const resp = await request(app)
			.get('/jobs')
			.query({ minSalary: 'fifty', hasEquity: true, nane: 'notakey' });

		expect(resp.statusCode).toBe(400);
	});
	test('fails: test next() handler', async function() {
		// there's no normal failure event which will cause this route to fail ---
		// thus making it hard to test that the error-handler works with it. This
		// should cause an error, all right :)
		await db.query('DROP TABLE jobs CASCADE');
		const resp = await request(app).get('/jobs').set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(500);
	});
});

/************************************** GET /jobs/:id */

describe('GET /jobs/:id', function() {
	test('works for anon', async function() {
		const resp = await request(app).get(`/jobs/${jobIds[0]}`);
		expect(resp.body).toEqual({
			job : {
				id      : jobIds[0],
				title   : 'test1',
				salary  : 100,
				equity  : '0.1',
				company : {
					handle       : 'c1',
					name         : 'C1',
					numEmployees : 1,
					description  : 'Desc1',
					logoUrl      : 'http://c1.img'
				}
			}
		});
	});

	test('not found error for no such job', async function() {
		const resp = await request(app).get(`/jobs/0`);
		expect(resp.statusCode).toEqual(404);
	});
});

/************************************** PATCH /jobs/:id */

describe('PATCH /jobs/:id', function() {
	test('works for admin', async function() {
		const resp = await request(app)
			.patch(`/jobs/${jobIds[0]}`)
			.send({
				title : 'testUpdated'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({
			job : {
				id            : jobIds[0],
				title         : 'testUpdated',
				salary        : 100,
				equity        : '0.1',
				companyHandle : 'c1'
			}
		});
	});

	test('unauth error for anon or non-admin', async function() {
		const resp = await request(app)
			.patch(`/jobs/${jobIds[0]}`)
			.send({
				title : 'testUpdated'
			})
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('not found on no such job', async function() {
		const resp = await request(app)
			.patch(`/jobs/0`)
			.send({
				title : 'testUpdated'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});

	test('bad request on id change attempt', async function() {
		const resp = await request(app)
			.patch(`/jobs/${jobIds[0]}`)
			.send({
				id : 999
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
	test('bad request on companyHandle change attempt', async function() {
		const resp = await request(app)
			.patch(`/jobs/${jobIds[0]}`)
			.send({
				companyHandle : 'c2'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});

	test('bad request on invalid data', async function() {
		const resp = await request(app)
			.patch(`/jobs/${jobIds[0]}`)
			.send({
				title  : 'testUpdate',
				salary : 'whachutalkinbout'
			})
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(400);
	});
});

/************************************** DELETE /jobs/:id */

describe('DELETE /jobs/:id', function() {
	test('works for admin', async function() {
		const resp = await request(app)
			.delete(`/jobs/${jobIds[0]}`)
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.body).toEqual({ deleted: `${jobIds[0]}` });
	});

	test('unauth for non-admin', async function() {
		const resp = await request(app)
			.delete(`/jobs/${jobIds[0]}`)
			.set('authorization', `Bearer ${u1Token}`);
		expect(resp.statusCode).toEqual(401);
	});
	test('unauth for anon', async function() {
		const resp = await request(app).delete(`/jobs/${jobIds[0]}`);
		expect(resp.statusCode).toEqual(401);
	});

	test('not found for no such company', async function() {
		const resp = await request(app)
			.delete(`/jobs/0`)
			.set('authorization', `Bearer ${adminToken}`);
		expect(resp.statusCode).toEqual(404);
	});
});
