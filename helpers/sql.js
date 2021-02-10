const { BadRequestError } = require('../expressError');

// THIS NEEDS SOME GREAT DOCUMENTATION.

/* 
* This is a helper function to update parts of an object, whatever is provided. Update schemas don't have required fields. It creates the part of a SQL UPDATE statement that comes after keyword SET

* parameters- dataToUpdate: {object} with fields {k1:value1, k2:val2,...} corresponding with fields to update
            - jsToSql: {object} maps js camelCase key names to their        respective database column name ({firstName: 'first_name'}); some fields may not require this (like an 'age' field)
* errors- throws BadRequestError if the keys array holds 0 items
* returns- {object} with {setCols: 'col1=$index+1, ...', values: [values from dataToUpdate]}



*/
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');

	// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
	const cols = keys.map((colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`);

	return {
		setCols : cols.join(', '),
		values  : Object.values(dataToUpdate)
	};
}

module.exports = { sqlForPartialUpdate };
