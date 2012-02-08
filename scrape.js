// pamscrape/scrape.js
// Bookmarklet for scraping data on political candidates

var Pamscrape = (function() {
    var init_complete = false;

    function addJQuery() {
	var s = document.createElement('script');
	s.setAttribute(
	    'src',
	    'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'
	);
	s.setAttribute('type', 'text/javascript');
	s.setAttribute('language', 'javascript');
	s.onload = scrape;
	document.getElementsByTagName('body')[0].appendChild(s);
    }

    function init() {
        if (init_complete) {
            return;
        }
	addJQuery();
	//init_complete = true;
	console.log('setup complete');
    }

    function csv(data) {
	var rows = [];
	for (idx in data) {
	    var raw_row = data[idx];
	    var row = []
	    for (col_idx in raw_row) {
		// TODO: escape the string being quoted
		row.push('"' + raw_row[col_idx] + '"');
	    }
	    rows.push(row.join(","));
	}
	return rows.join("\n");
    }

    function scrapeCalifornia() {
	var headings = ['Candidate', 'Zip', 'Race'];
	var candidates = [headings];
	var races = $('#centercontent h2');
	
	var zip_regexp = /.*,\s+[A-Z]{2}\s+(\d{5}([-]\d{4})?)/;
	if (!zip_regexp.test('Washington, DC 20008-2470')) {
	    throw new Exception('Failed to match test regexp');
	}
	function handleRace(race_idx, race) {
	    var name = race.innerText;
	    var ps = $(race).nextUntil('h2').filter('p').not('#footer');
	    ps.each(function(idx, p) {
		p = $(p);
		var zip = zip_regexp.exec(p.text());
		if (zip) {
		    p.find('span').each(function(span_idx, span) {
			candidates.push([span.innerText, zip[1], name]);
		    });
		}
	    });
	}
	races.each(handleRace);
	return candidates;
    }

    function display(rows) {
	var tbl = $('<table/>');
	var tbody = $('<tbody/>');
	$(rows).each(function(_, row) {
	    var tr = $('<tr/>');
	    $(row).each(function(_, col) {
		var td = $('<td/>');
		td.text(col);
		td.css('border-style', 'solid');
		td.css('border-color', '#000');
		tr.append(td);
	    });
	    tbody.append(tr);
	});
	tbl.append(tbody);
	tbl.attr('border', 1);
	tbl.css('border-style', 'solid');
	tbl.css('border-color', '#000');
	tbl.css('border-collapse', 'separate');

	var div = $('<div/>');
	div.css('position', 'absolute');
	div.css('background-color', '#FFFFFF');
	div.css('font-size', '14px');
	div.css('overflow', 'auto');
	div.css('top', '10px');
	div.css('left', '100px');
	div.css('z-index', '100000');
	div.append(tbl);
	$('body').append(div);
    }

    function scrape() {
	var scrapeFun = scrapers[window.location];
	if (!scrapeFun) {
	    console.log('No scraper defined for ' + window.location);
	    return;
	}
	var table = scrapeFun();
	console.log(csv(table));
	display(table);
    }

    var scrapers = {
	"http://www.sos.ca.gov/elections/2000_candidate_list.htm":
	scrapeCalifornia
    };

    return {
	init: init,
	scrape: scrape
    };

})();

Pamscrape.init();