'use strict';
'require view';
'require fs';
'require poll';
'require uci';

function readUci(opt, def) {
	var v = uci.get('AdGuardHome', 'AdGuardHome', opt);
	return (v == null) ? def : v;
}

function shell(cmd) {
	return fs.exec('/bin/sh', [ '-c', cmd ]);
}

function pad(n) {
	return n < 10 ? '0' + n : String(n);
}

function linesToLocal(str) {
	return (str || '').trim().split('\n').map(function(v) {
		var dt = new Date(v.substring(0, 19) + ' UTC');
		if (String(dt) !== 'Invalid Date')
			return dt.getFullYear() + '/' + pad(dt.getMonth() + 1) + '/' + pad(dt.getDate()) + ' ' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':' + pad(dt.getSeconds()) + v.substring(19);
		return v;
	});
}

function linesToUTC(str) {
	return (str || '').trim().split('\n').map(function(v) {
		var dt = new Date(v.substring(0, 19));
		if (String(dt) !== 'Invalid Date')
			return dt.getUTCFullYear() + '/' + pad(dt.getUTCMonth() + 1) + '/' + pad(dt.getUTCDate()) + ' ' + pad(dt.getUTCHours()) + ':' + pad(dt.getUTCMinutes()) + ':' + pad(dt.getUTCSeconds()) + v.substring(19);
		return v;
	});
}

function download(name, content) {
	var a = document.createElement('a');
	var blob = new Blob([ content ]);
	a.download = name;
	a.href = URL.createObjectURL(blob);
	a.click();
	URL.revokeObjectURL(blob);
}

return view.extend({
	load: function() {
		return uci.load('AdGuardHome');
	},

	render: function() {
		var logfile = readUci('logfile', '');
		var timereplace = logfile !== 'syslog' && logfile !== '';
		var pollcheck = logfile !== '';
		var reverse = true;
		var localtime = timereplace;
		var textarea = E('textarea', {
			'id': 'cbid.logview.1.conf',
			'class': 'cbi-input-textarea',
			'style': 'width:100%;display:inline',
			'rows': 32,
			'cols': 60,
			'readonly': 'readonly'
		});

		function addText(text) {
			if (!text)
				return;

			if (localtime) {
				var lines = linesToUTC(text);
				textarea.value = reverse ? lines.reverse().join('\n') + textarea.value : textarea.value + lines.join('\n');
				textarea.value = linesToLocal(textarea.value).join('\n');
			}
			else {
				textarea.value = reverse ? text.split('\n').reverse().join('\n') + textarea.value : textarea.value + text;
			}
		}

		function getLog() {
			if (logfile === 'syslog') {
				return L.resolveDefault(fs.stat('/var/run/AdGuardHomesyslog'), null).then(function(st) {
					var p = st ? Promise.resolve() : shell('(/usr/share/AdGuardHome/getsyslog.sh &); sleep 1;');
					return p.then(function() { return fs.write('/var/run/AdGuardHomesyslog', '1'); }).then(function() { return '/tmp/AdGuardHometmp.log'; });
				});
			}

			return Promise.resolve(logfile);
		}

		function pollLog() {
			return getLog().then(function(path) {
				return L.resolveDefault(fs.stat(path), null).then(function(st) {
					if (!st)
						return '';
					return L.resolveDefault(fs.read('/var/run/lucilogpos'), '0').then(function(pos) {
						pos = parseInt(pos, 10) || 0;
						return L.resolveDefault(fs.read(path), '').then(function(log) {
							var chunk = log.substring(pos);
							return fs.write('/var/run/lucilogpos', String(log.length)).then(function() { addText(chunk); });
						});
					});
				});
			});
		}

		var nodes = [
			E('h2', {}, _('Log')),
			E('div', { 'class': 'cbi-map' }, [
				E('div', { 'class': 'cbi-section' }, [
					E('label', {}, [ E('input', { type: 'checkbox', checked: 'checked', click: function() { reverse = !reverse; textarea.value = textarea.value.split('\n').reverse().join('\n'); } }), _('reverse') ]),
					timereplace ? E('label', { style: 'margin-left:1em' }, [ E('input', { type: 'checkbox', checked: 'checked', click: function() { localtime = !localtime; textarea.value = (localtime ? linesToLocal(textarea.value) : linesToUTC(textarea.value)).join('\n'); } }), _('localtime') ]) : '',
					E('br'), textarea, E('br'),
					E('button', { 'class': 'btn cbi-button cbi-button-apply', click: function() { return getLog().then(function(path) { return fs.write(path, '').then(function() { textarea.value = ''; }); }); } }, _('dellog')), ' ',
					E('button', { 'class': 'btn cbi-button cbi-button-apply', click: function() {
						var dt = new Date();
						download('AdGuardHome' + (dt.getMonth() + 1) + '-' + dt.getDate() + '-' + dt.getHours() + '_' + dt.getMinutes() + '.log', textarea.value);
					} }, _('download log'))
				])
			])
		];

		fs.write('/var/run/lucilogpos', '0').catch(function() {});

		if (pollcheck)
			poll.add(pollLog, 3);
		else
			textarea.value = _('Please add log path in config to enable log');

		return E(nodes);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
