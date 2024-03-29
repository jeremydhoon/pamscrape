// pamscrape/scrape.js
// Bookmarklet for scraping data on political candidates

var Pamscrape = (function() {
    var init_complete = false;
    var zip_regexp = /.*,\s+[A-Z]{2}\s+(\d{5}([-]\d{4})?)/;
    if (!zip_regexp.test('Washington, DC 20008-2470')) {
	throw new Exception('Failed to match test regexp');
    }

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

    function scrapeCalifornia() {
	var headings = ['Candidate', 'Zip', 'Race'];
	var candidates = [headings];
	var races = $('#centercontent h2');
	
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

    function scrapeMissouri() {
	var headings = ['Candidate', 'Zip', 'Race', 'Party'];
	var candidates = [headings];
	var races = $('table tbody tr table tbody tr[bgcolor] td.office');
	function handleRace(_, race_td) {
	    var race_name = race_td.innerText;
	    var rows = $(race_td).parent().nextUntil(':not([bgcolor])');
	    $(rows).each(function(_, row) {
		var children = $(row).children();
		var zip = zip_regexp.exec(children.get(3).innerText);
		if (zip) {
		    candidates.push([
			children.get(1).innerText,
			zip[1],
			race_name,
			children.get(2).innerText
		    ]);
		}
	    });
	}
	$(races).each(handleRace);
	return candidates;
    }

    function scrapeLinkedIn() {
	var headings = ['Last', 'First', 'Company', 'Title', 'Email'];
	var contacts = [];
	var conns = $('div.conn-wrapper');
	var conn_div = null;
	var row = null;
	var name_regexp = /([^,]*),\s+(.*)/
	function handleConns() {
	    if (conns.size() === 0) {
		display(contacts);
		console.log(csv(contacts));
		return;
	    }
	    conn_div = conns.get(0);
	    console.log(conn_div);

	    var conn_wrapped = $(conn_div);
	    var names = name_regexp.exec(
              conn_wrapped.find('span.conn-name').text()
            );
	    var company_span = conn_wrapped.find('span.company-name');
	    var title = company_span.parent().text();
	    row = [
		$.trim(names[1]),
		$.trim(names[2]),
		company_span.text(),
		title
	    ];
	    var event = document.createEvent("HTMLEvents");
	    event.initEvent('click', true, true);
	    conn_div.dispatchEvent(event);
	    setTimeout(loadCallback, 20);
	}

	function loadCallback() {
	    if ($('div#detail-panel .indicator').size() > 0) {
		setTimeout(loadCallback, 10);
		return;prev
	    }
	    var email = $('div#detail-panel dl dd a');
	    email.each(function(_, a) {
		a = $(a);
		if (a.attr('href') &&
		    a.attr('href').indexOf('mailto:') === 0) {
		    row.push(a.text());
		}
	    });
	    contacts.push(row);
	    conns = conns.slice(1);
	    handleConns();
	}
	handleConns();
    }

    function scrapeArizona() {
	var races = $('font > table').slice(2).find('tr[bgcolor=red]');
	var headings = ['Candidate', 'Zip', 'Race', 'Party'];
	var candidates = [headings];
	function handleRace(_, race_tr) {
	    var race = $(race_tr);
	    var race_name = $.trim(race.text());
	    var candidate_rows = race.nextUntil('tr[bgcolor=red]');
	    function handleRow(_, candidate_tr) {
		var candidate = $(candidate_tr).children();
		var party = $.trim(candidate.eq(0).text());
		var info = candidate.eq(1).find('table > tbody')
		    .children();
		var name = $.trim(info.eq(0).text());
		var address = info.eq(1).find('td').eq(0).text();
		var zip = zip_regexp.exec(address);
		candidates.push([name, $.trim(zip[1]), race_name, party]);
	    }
	    candidate_rows.each(handleRow);
	}
	races.each(handleRace);
	return candidates;
    }

    function scrapeOregon() {
	var races = $('div#content > h3').slice(2);
	var headings = ['Candidate', 'Zip', 'Race', 'Party'];
	var candidates = [headings];
	function handleRace(_, race_h3) {
	    var race = $(race_h3);
	    var race_name = $.trim(race.text());
	    var candidate_ps = race.nextUntil('h3');
	    var zip_found = null;
	    function handleCandidate(_, candidate_p) {
		if (!$.trim(candidate_p.innerHTML)) {
		    return;
		}
		var rows = candidate_p.innerHTML.split('<br>');
		var name_and_party = rows[0].split('-');
		var name = $.trim(name_and_party[0]);
		var party_matches = /\((.+)\)/.exec(name_and_party[1]);
		var party = null !== party_matches ? party_matches[1] : null;
		$.each($(rows).slice(2), function (_, row) {
		    var zip = zip_regexp.exec(row);
		    if (null !== zip) {
			zip_found = $.trim(zip[1]);
		    }
		});
		candidates.push([name, zip_found, race_name, party]);
	    }
	    candidate_ps.each(handleCandidate);
	}
	races.each(handleRace);
	return candidates;
    }

    function scrapeOregonElec() {
	var candidate_rows = $('tr:has(td[align=left])');
	var headings = ['Candidate', 'Zip', 'Race', 'Party'];
	var candidates = [headings];
	function handleRow(_, row_tr) {
	    var row = $(row_tr);
	    var race_name = $.trim(row.text());
	    row = row.next();
	    var name_and_party = /^(.+)\s+\((.+)\)$/.exec($.trim(row.text()));
	    var zip = null;
	    while (!zip && row) {
		row = row.next();
		zip = zip_regexp.exec(row.text());
	    }
	    candidates.push([
		$.trim(name_and_party[1]),
		$.trim(zip[1]),
		race_name,
		$.trim(name_and_party[2])
	    ]);
	}
	candidate_rows.each(handleRow);
	return candidates;
    }

    function scrape() {
	var scrapeFun = null;
	for (name in scrapers) {
	    if (0 === String(window.location).indexOf(name)) {
		scrapeFun = scrapers[name];
		break;
	    }
	}
	if (!scrapeFun) {
	    console.log('No scraper defined for ' + window.location);
	    return;
	}
	var table = scrapeFun();
	console.log(csv(table));
	display(table);
    }

    var scrapers = {
	"http://www.sos.ca.gov/elections/":
	scrapeCalifornia,
	"http://www.sos.mo.gov/enrweb/candidatelist.asp":
	scrapeMissouri,
	"http://www.linkedin.com/connections":
	scrapeLinkedIn,
	"http://www.azsos.gov/election":
	scrapeArizona,
	"http://www.oregonvotes.org/pages/history/archive":
	scrapeOregon,
	"http://egov.sos.state.or.us/elec/pkg_e1_web_office.office_detl_print":
	scrapeOregonElec,
    };

    return {
	init: init,
	scrape: scrape
    };

})();

Pamscrape.init();
