'use strict';

/*global require,describe,it,expect*/
var JulianDate = require('terriajs-cesium/Source/Core/JulianDate');
var TableStructure = require('../../lib/Map/TableStructure');
// var TableColumn = require('../../lib/Map/TableColumn');
var VarType = require('../../lib/Map/VarType');

var separator = ',';
if (typeof Intl === 'object' && typeof Intl.NumberFormat === 'function') {
    separator = (Intl.NumberFormat().format(1000)[1]);
}

describe('TableStructure', function() {

    it('can read from json object', function() {
        // Use a copy of data to make the column, because knockout adds stuff to data.
        // Also, test a "slice" of the column's values, to remove knockout stuff.
        var data = [['x', 'y'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data.slice());
        expect(tableStructure.columns.length).toEqual(2);
        expect(tableStructure.columns[0].name).toEqual('x');
        expect(tableStructure.columns[0].values.slice()).toEqual([1, 3, 4]);
        expect(tableStructure.columns[1].name).toEqual('y');
        expect(tableStructure.columns[1].values.slice()).toEqual([5, 8, -3]);
    });

    it('can read from csv string', function() {
        var csvString = 'x,y\r\n1,5\r\n3,8\r\n4,-3\r\n';
        var tableStructure = TableStructure.fromCsv(csvString);
        expect(tableStructure.columns.length).toEqual(2);
        expect(tableStructure.columns[0].name).toEqual('x');
        expect(tableStructure.columns[0].values.slice()).toEqual([1, 3, 4]);
        expect(tableStructure.columns[1].name).toEqual('y');
        expect(tableStructure.columns[1].values.slice()).toEqual([5, 8, -3]);
    });

    it('can read from json object into existing structure', function() {
        var data = [['x', 'y'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = new TableStructure();
        tableStructure.loadFromJson(data);
        expect(tableStructure.columns.length).toEqual(2);
        expect(tableStructure.columns[0].name).toEqual('x');
        expect(tableStructure.columns[0].values.slice()).toEqual([1, 3, 4]);
        expect(tableStructure.columns[1].name).toEqual('y');
        expect(tableStructure.columns[1].values.slice()).toEqual([5, 8, -3]);
    });

    it('can read from csv string into existing structure', function() {
        var csvString = 'x,y\r\n1,5\r\n3,8\r\n4,-3\r\n';
        var tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns.length).toEqual(2);
        expect(tableStructure.columns[0].name).toEqual('x');
        expect(tableStructure.columns[0].values.slice()).toEqual([1, 3, 4]);
        expect(tableStructure.columns[1].name).toEqual('y');
        expect(tableStructure.columns[1].values.slice()).toEqual([5, 8, -3]);
    });

    it('can convert to ArrayOfColumns', function() {
        var data = [['x', 'y'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data);
        var columns = tableStructure.toArrayOfColumns();
        expect(columns.length).toEqual(2);
        expect(columns[0]).toEqual(['x', 1, 3, 4]);
        expect(columns[1]).toEqual(['y', 5, 8, -3]);
    });

    it('can convert to ArrayOfRows', function() {
        var data = [['x', 'y'], ['1', '5'], ['3', '8'], ['4', '-3']];
        var tableStructure = TableStructure.fromJson(data);
        var rows = tableStructure.toArrayOfRows();
        expect(rows.length).toEqual(4);
        expect(rows).toEqual(data);
    });

    it('can convert to ArrayOfRows with formatting', function() {
        var data = [['x', 'y'], [1.678, 9.883], [54321, 12345], [4, -3]];
        var options = {columnOptions: {
            x: {format: {maximumFractionDigits: 0}},
            y: {name: 'new y (,000)', format: {useGrouping: true, maximumFractionDigits: 1}}
        }};
        var target = [['x', 'new y (,000)'], ['2', '9.9'], ['54321', '12' + separator + '345'], ['4', '-3']];
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(data);
        var rows = tableStructure.toArrayOfRows();
        expect(rows.length).toEqual(4);
        expect(rows).toEqual(target);
    });

    it('can convert to ArrayOfRows with formatting and quotes if containing commas', function() {
        var data = [['x', 'y'], [1.678, 9.883], [54321, 12345], [4, -3]];
        var options = {columnOptions: {
            x: {format: {maximumFractionDigits: 0}},
            y: {name: 'new y (,000)', format: {useGrouping: true, maximumFractionDigits: 1}}
        }};
        var target = [['x', '"new y (,000)"'], ['2', '9.9'], ['54321', '"12' + separator + '345"'], ['4', '-3']];
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(data);
        var rows = tableStructure.toArrayOfRows(undefined, undefined, true, true); // 4th argument requests the quotes.
        expect(rows.length).toEqual(4);
        expect(rows).toEqual(target);
    });

    it('can convert to csv', function() {
        var data = [['x', 'y'], [1.678, 9.883], [54321, 12345], [4, -3]];
        var tableStructure = new TableStructure();
        tableStructure = tableStructure.loadFromJson(data);
        var csvString = tableStructure.toCsvString();
        expect(csvString).toEqual('x,y\n1.678,9.883\n54321,12345\n4,-3');
    });

    it('can convert to row objects', function() {
        var data = [['x', 'y'], [1, 5.12345], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data);
        var rowObjects = tableStructure.toRowObjects();
        expect(rowObjects.length).toEqual(3);
        expect(rowObjects[0]).toEqual({x: '1', y: '5.12345'});
        expect(rowObjects[1]).toEqual({x: '3', y: '8'});
        expect(rowObjects[2]).toEqual({x: '4', y: '-3'});
    });

    it('can convert to point arrays', function() {
        var data = [['a', 'b', 'c'], [1, 2, 3], [4, 5, 6], [7, 8, 9]];
        var tableStructure = TableStructure.fromJson(data);
        var xy = tableStructure.toPointArrays();
        expect(xy.length).toEqual(2);
        expect(xy[0]).toEqual([{x: 1, y: 2}, {x: 4, y: 5}, {x: 7, y: 8}]);
        expect(xy[1]).toEqual([{x: 1, y: 3}, {x: 4, y: 6}, {x: 7, y: 9}]);
    });

    it('can get column names', function() {
        var data = [['x', 'y'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data);
        expect(tableStructure.getColumnNames()).toEqual(['x', 'y']);
    });

    it('can get column with name', function() {
        var data = [['x', 'y'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data);
        expect(tableStructure.getColumnWithName('y')).toEqual(tableStructure.columns[1]);
        expect(tableStructure.getColumnWithName('z')).toBeUndefined();
    });

    it('sets column types', function() {
        var data = [['x', 'lat'], [1, 5], [3, 8], [4, -3]];
        var tableStructure = TableStructure.fromJson(data);
        expect(tableStructure.columnsByType[VarType.SCALAR].length).toEqual(1);
        expect(tableStructure.columnsByType[VarType.SCALAR][0].name).toEqual('x');
        expect(tableStructure.columnsByType[VarType.LAT].length).toEqual(1);
        expect(tableStructure.columnsByType[VarType.LAT][0].name).toEqual('lat');
    });

    it('counts the final row of CSV files with no trailing linefeed(s)', function() {
        var csvString = 'postcode,value\n0800,1\n0885,2';
        var tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);

        csvString = csvString + '\n';
        tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);

        // The ABS returns a csv data file for Australia with two final linefeeds.
        csvString = csvString + '\n';
        tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);
    });

    it('ignores final blank rows of CSV files', function() {
        var csvString = 'postcode,value\n0800,1,\n0885,2,';
        var tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);

        csvString = csvString + '\n';
        tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);

        csvString = csvString + '\n\n\n\n\n';
        tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].values.length).toEqual(2);
        expect(tableStructure.columns[1].values.length).toEqual(2);
    });

    it('can read csv string where column names are numbers', function() {
        var csvString = '1,2\n9,8\n7,6';
        var tableStructure = new TableStructure();
        tableStructure.loadFromCsv(csvString);
        expect(tableStructure.columns[0].name).toEqual('1');
        expect(tableStructure.columns[1].name).toEqual('2');
    });

    it('can describe rows with dates with and without timezones nicely', function() {
        var csvString = 'date,value\r\n2015-10-15T12:34:56,5\r\n2015-10-02T12:34:56Z,8\r\n2015-11-03\r\n';
        var tableStructure = TableStructure.fromCsv(csvString);
        var htmls = tableStructure.toRowDescriptions();
        expect(htmls[0]).toContain('Thu Oct 15 2015 12:34:56');  // Thu 15 Oct would be nicer outside USA.
        expect(htmls[0]).not.toContain('2015-10-15T12:34:56');
        var expectedDate1 = JulianDate.toDate(JulianDate.fromIso8601('2015-10-02T12:34:56Z'));
        expect(htmls[1]).toContain('' + expectedDate1);
        expect(htmls[1]).not.toContain('2015-10-02T12:34:56');
        expect(htmls[2]).toContain('>2015-11-03<'); // No time is added when only the date is given.
    });

    it('can describe rows with formatting', function() {
        var data = [['x', 'y'], [1.678, 5.123], [54321, 12345], [4, -3]];
        var options = {columnOptions: {y: {name: 'new y', format: {useGrouping: true, maximumFractionDigits: 1}}}};
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(data);
        var htmls = tableStructure.toRowDescriptions();
        expect(htmls[0]).toContain('new y');
        expect(htmls[0]).toContain('1.678');
        expect(htmls[0]).toContain('5.1');
        expect(htmls[0]).not.toContain('5.12');
        expect(htmls[1]).toContain('54321');
        expect(htmls[1]).toContain('12' + separator + '345');
    });

    it('can tell if it has address data', function() {
        var data = [['x', 'y', 'Address'], [1.678, 5.123, "25 Gozzard Street, GUNGAHLIN TOWN CENTRE, ACT"],
                                           [54321, 12345, "137 Reed Street, TUGGERANONG, ACT"],
                                           [4, -3, "81 Mildura Street, FYSHWICK, ACT"]];
        var options = {columnOptions: {y: {name: 'new y', format: {useGrouping: true, maximumFractionDigits: 1}}}};
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(data);
        expect(tableStructure.hasAddress).toBe(true);

        var dataNoAddr = [['x', 'y'], [1.678, 5.123], [54321, 12345], [4, -3]];
        var optionsNoAddr = {columnOptions: {y: {name: 'new y', format: {useGrouping: true, maximumFractionDigits: 1}}}};
        var tableStructureNoAddr = new TableStructure('foo', optionsNoAddr);
        tableStructureNoAddr = tableStructure.loadFromJson(dataNoAddr);
        expect(tableStructureNoAddr.hasAddress).toBe(false);
    });

    it('can get feature id mapping', function() {
        var data = [['year', 'id', 'lat', 'lon'], [1970, 'A', 16.8, 5.2], [1971, 'B', 16.2, 5.2], [1971, 'A', 67.8, 1.2], [1972, 'B', 68.2, 2.2]];
        var options = {idColumnNames: ['id']};
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(data);
        var map = tableStructure.getIdMapping();
        expect(map['A']).toEqual([0, 2]);
        expect(map['B']).toEqual([1, 3]);
    });

    it('can append a table', function() {
        var data = [['year', 'id', 'lat', 'lon'], [1970, 'A', 16.8, 5.2], [1971, 'B', 16.2, 5.2]];
        var dat2 = [['year', 'id', 'lat', 'lon'], [1980, 'C', 16.8, 5.2], [1981, 'D', 16.2, 5.2]];
        var table1 = new TableStructure('foo');
        var table2 = new TableStructure('bar');
        table1 = table1.loadFromJson(data);
        table2 = table2.loadFromJson(dat2);
        table1.append(table2);
        expect(table1.columns[0].values.slice()).toEqual([1970, 1971, 1980, 1981]);
        expect(table1.columns[1].values.slice()).toEqual(['A', 'B', 'C', 'D']);
    });

    it('can append part of a table', function() {
        var data = [['year', 'id', 'lat', 'lon'], [1970, 'A', 16.8, 5.2], [1971, 'B', 16.2, 5.2]];
        var dat2 = [['year', 'id', 'lat', 'lon'], [1980, 'C', 16.8, 5.2], [1981, 'D', 16.2, 5.2], [1982, 'E', 16, 5], [1983, 'F', 15, 6]];
        var table1 = new TableStructure('foo');
        var table2 = new TableStructure('bar');
        table1 = table1.loadFromJson(data);
        table2 = table2.loadFromJson(dat2);
        table1.append(table2, [1, 3]);
        expect(table1.columns[0].values.slice()).toEqual([1970, 1971, 1981, 1983]);
        expect(table1.columns[1].values.slice()).toEqual(['A', 'B', 'D', 'F']);
    });

    it('can replace rows', function() {
        var data = [['year', 'id', 'lat', 'lon'], [1970, 'A', 16.8, 5.2], [1971, 'B', 16.2, 5.2]];
        var dat2 = [['year', 'id', 'lat', 'lon'], [1980, 'C', 16.8, 5.2], [1981, 'D', 16.2, 5.2]];
        var table1 = new TableStructure('foo');
        var table2 = new TableStructure('bar');
        table1 = table1.loadFromJson(data);
        table2 = table2.loadFromJson(dat2);
        table1.replaceRows(table2, {1: 0});
        expect(table1.columns[0].values.slice()).toEqual([1970, 1980]);
        expect(table1.columns[1].values.slice()).toEqual(['A', 'C']);
    });

    it('can merge tables with dates', function() {
        var data = [['year', 'id', 'lat', 'lon'], [1970, 'A', 16.8, 5.2], [1971, 'B', 16.2, 5.2]];
        var dat2 = [['year', 'id', 'lat', 'lon'], [1975, 'C', 15, 5.5], [1970, 'A', 12, 8], [1971, 'A', 13, 9]];
        var options = {idColumnNames: ['id']};
        var table1 = new TableStructure('foo', options);
        var table2 = new TableStructure('bar');  // Only uses idColumnNames on table1.
        table1 = table1.loadFromJson(data);
        table2 = table2.loadFromJson(dat2);
        table1.activeTimeColumn = table1.columns[0];
        table1.columns[1].isActive = true;
        table1.columns[1].color = 'blue';
        table1.merge(table2);
        expect(table1.columns[0].values.slice()).toEqual([1970, 1971, 1975, 1971]);
        expect(table1.activeTimeColumn.dates.length).toEqual(4); // ie. activeTimeColumn updates too.
        expect(table1.columns[1].values.slice()).toEqual(['A', 'B', 'C', 'A']);
        expect(table1.columns[2].values.slice()).toEqual([12, 16.2, 15, 13]);
        expect(table1.columns[1].isActive).toBe(true); // ie. Don't lose options on the columns.
        expect(table1.columns[1].color).toEqual('blue');
    });

    it('can merge tables without dates', function() {
        var data = [['id', 'lat', 'lon'], ['A', 16.8, 5.2], ['B', 16.2, 5.2]];
        var dat2 = [['id', 'lat', 'lon'], ['A', 12, 8], ['C', 15, 5.5]];
        var options = {idColumnNames: ['id']};
        var table1 = new TableStructure('foo', options);
        var table2 = new TableStructure('bar');  // Only uses idColumnNames on table1.
        table1 = table1.loadFromJson(data);
        table2 = table2.loadFromJson(dat2);
        table1.merge(table2);
        expect(table1.columns[0].values.slice()).toEqual(['A', 'B', 'C']);
        expect(table1.columns[1].values.slice()).toEqual([12, 16.2, 15]);
    });

    it('can add columns', function() {
        var dataNoAddr = [['x', 'y'], [1.678, 5.123], [54321, 12345], [4, -3]];
        var options = {columnOptions: {y: {name: 'new y', format: {useGrouping: true, maximumFractionDigits: 1}}}};
        var tableStructure = new TableStructure('foo', options);
        tableStructure = tableStructure.loadFromJson(dataNoAddr);
        var longValues = [44.0, 55.0, 66.0];
        var latValues = [11.0, 22.0, 33.0];
        expect(tableStructure.hasLatitudeAndLongitude).toBe(false);
        tableStructure.addColumn("lat", latValues);
        tableStructure.addColumn("lon", longValues);
        expect(tableStructure.hasLatitudeAndLongitude).toBe(true);
        expect(tableStructure.columns[VarType.LAT].values).toBe(latValues);
        expect(tableStructure.columns[VarType.LON].values).toBe(longValues);
    });

    it('can sort columns', function() {
        var data = [['x', 'y', 'z'], [3, 5, 'a'], [1, 8, 'c'], [4, -3, 'b']];
        var tableStructure = TableStructure.fromJson(data);
        tableStructure.sortBy(tableStructure.getColumnWithName('x'));
        expect(tableStructure.getColumnWithName('x').values.slice()).toEqual([1, 3, 4]);
        expect(tableStructure.getColumnWithName('y').values.slice()).toEqual([8, 5, -3]);
        expect(tableStructure.getColumnWithName('z').values.slice()).toEqual(['c', 'a', 'b']);
        tableStructure.sortBy(tableStructure.getColumnWithName('z'));
        expect(tableStructure.getColumnWithName('x').values.slice()).toEqual([3, 4, 1]);
        expect(tableStructure.getColumnWithName('y').values.slice()).toEqual([5, -3, 8]);
        expect(tableStructure.getColumnWithName('z').values.slice()).toEqual(['a', 'b', 'c']);
        tableStructure.sortBy(tableStructure.getColumnWithName('x'), function(a, b) { return b - a; }); // descending
        expect(tableStructure.getColumnWithName('x').values.slice()).toEqual([4, 3, 1]);
        expect(tableStructure.getColumnWithName('y').values.slice()).toEqual([-3, 5, 8]);
        expect(tableStructure.getColumnWithName('z').values.slice()).toEqual(['b', 'a', 'c']);
    });

    it('can sort columns by date', function() {
        // Note the last date occurs before the first, but a string compare would disagree.
        var data = [['date', 'v'], ['2010-06-20T10:00:00.0+1000', 'a'], ['2010-06-19T10:00:00.0+1000', 'b'], ['2010-06-20T10:00:00.0+1100', 'c']];
        var tableStructure = TableStructure.fromJson(data);
        tableStructure.sortBy(tableStructure.columns[0]);
        expect(tableStructure.columns[1].values.slice()).toEqual(['b', 'c', 'a']);
    });
});
