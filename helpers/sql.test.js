const { sqlForPartialUpdate } = require('./sql');

describe('test partial update helper', () => {
	test('1 update field', () => {
		const update = sqlForPartialUpdate({ keyName: 'val' }, { keyName: 'key_name' });
		expect(update).toEqual({
			setCols : `"key_name"=$1`,
			values  : [ 'val' ]
		});
	});
	test('multiple update fields', () => {
		const update = sqlForPartialUpdate(
			{ keyOne: 'val1', keyTwo: 'val2', keyThree: 'val3' },
			{ keyOne: 'key_one', keyTwo: 'key_two', keyThree: 'key_three' }
		);
		expect(update).toEqual({
			setCols : `"key_one"=$1, "key_two"=$2, "key_three"=$3`,
			values  : [ 'val1', 'val2', 'val3' ]
		});
	});
});
