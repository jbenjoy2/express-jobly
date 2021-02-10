'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const Job = require('./job');
const {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	jobIds
} = require('./_testCommon');

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe('create', function() {
	let newJob = {
		companyHandle : 'c1',
		title         : 'Test',
		salary        : 100,
		equity        : '0.1'
	};

	test('works', async function() {
		let job = await Job.create(newJob);
		expect(job).toEqual({ ...newJob, id: expect.any(Number) });
	});
});

/************************************** findAll */

describe('findAll', function() {
	test('works: no filter', async function() {
		let jobs = await Job.findAll();
		expect(jobs).toEqual([
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
				equity        : '0',
				companyHandle : 'c1',
				companyName   : 'C1'
			},
			{
				id            : jobIds[3],
				title         : 'test4',
				salary        : null,
				equity        : null,
				companyHandle : 'c1',
				companyName   : 'C1'
			}
		]);
	});
	test('filter by title', async () => {
		// this will also be testing the ILIKE functionality in the database query
		let jobs = await Job.findAll({ title: 'est1' });
		expect(jobs).toEqual([
			{
				id            : jobIds[0],
				title         : 'test1',
				salary        : 100,
				equity        : '0.1',
				companyHandle : 'c1',
				companyName   : 'C1'
			}
		]);
	});
	test('filter by minSalary', async () => {
		let jobs = await Job.findAll({ minSalary: 200 });
		expect(jobs).toEqual([
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
				equity        : '0',
				companyHandle : 'c1',
				companyName   : 'C1'
			}
		]);
	});
	test('filter by hasEquity', async () => {
		let jobs = await Job.findAll({ hasEquity: true });
		expect(jobs).toEqual([
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
			}
		]);
	});
	test('filter by salary and equity', async () => {
		let jobs = await Job.findAll({ minSalary: 200, hasEquity: true });
		expect(jobs).toEqual([
			{
				id            : jobIds[1],
				title         : 'test2',
				salary        : 200,
				equity        : '0.2',
				companyHandle : 'c1',
				companyName   : 'C1'
			}
		]);
	});
	test('return empty list if filter returns nothing', async () => {
		let jobs = await Job.findAll({ title: 'notgonnafindme' });
		expect(jobs).toEqual([]);
	});
});

/************************************** get */

describe('get', function() {
	test('works', async function() {
		let job = await Job.get(jobIds[0]);
		expect(job).toEqual({
			id      : jobIds[0],
			title   : 'test1',
			salary  : 100,
			equity  : '0.1',
			company : {
				handle       : 'c1',
				name         : 'C1',
				description  : 'Desc1',
				numEmployees : 1,
				logoUrl      : 'http://c1.img'
			}
		});
	});

	test('not found if no such company', async function() {
		try {
			await Job.get(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});

// /************************************** update */

describe('update', function() {
	const updateData = {
		title  : 'Updated',
		salary : 550,
		equity : '0.5'
	};

	test('works', async function() {
		let job = await Job.update(jobIds[0], updateData);
		expect(job).toEqual({
			id            : jobIds[0],
			companyHandle : 'c1',
			...updateData
		});
	});

	test('not found if no such job', async function() {
		try {
			await Job.update(0, updateData);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});

	test('bad request with no data', async function() {
		try {
			await Job.update(jobIds[0], {});
			fail();
		} catch (err) {
			expect(err instanceof BadRequestError).toBeTruthy();
		}
	});
});

// /************************************** delete */

describe('remove', function() {
	test('works', async function() {
		await Job.remove(jobIds[0]);
		const res = await db.query('SELECT id FROM jobs WHERE id=$1', [ jobIds[0] ]);
		expect(res.rows.length).toEqual(0);
	});

	test('not found if no such company', async function() {
		try {
			await Job.remove(0);
			fail();
		} catch (err) {
			expect(err instanceof NotFoundError).toBeTruthy();
		}
	});
});
