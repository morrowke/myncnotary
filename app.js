// ===== SCHEDULER SETTINGS =====
// Set open to true once your commission is issued. That turns on the appointment
// request form and hides the "coming soon" and "Get Notified" pieces of the page.
window.BOOKING = {
    open: true,
    earliestDate: 2026-11-19,                                  // optional first bookable date, 'YYYY-MM-DD'
    minLeadDays: 0,                                    // days of notice you need
    maxAdvanceDays: 60,                                // how far ahead people can book
    blockedDates: [],                                  // e.g. ['2026-12-25', '2027-01-01']
    stepMinutes: 30,                                   // spacing between start times
    weekday: { start: '16:30', lastStart: '22:00' },   // Mon-Fri, 24-hour clock
    weekend: { start: '07:00', lastStart: '22:00' }    // Sat-Sun, 24-hour clock
};

(function () {
    // Formspree endpoint for the "Get Notified" form.
    // If this is ever left empty, the form falls back to opening an email draft.
    var FORM_ENDPOINT = 'https://formspree.io/f/mnppykod';
    var FALLBACK_EMAIL = 'info@myncnotary.com';

    var form = document.getElementById('notifyForm');
    var statusEl = document.getElementById('nStatus');
    var submitBtn = document.getElementById('nSubmit');
    var nName = document.getElementById('nName');
    var nEmail = document.getElementById('nEmail');
    var nConsent = document.getElementById('nConsent');

    function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = 'form-status ' + (cls || ''); }
    function done() {
        form.reset();
        setStatus('Thank you! You\u2019re on the list, and I\u2019ll be in touch when appointments open.', 'ok');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        [nName, nEmail].forEach(function (i) { i.classList.remove('invalid'); });

        var name = nName.value.trim();
        var email = nEmail.value.trim();
        var phone = document.getElementById('nPhone').value.trim();
        var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

        if (!name) { nName.classList.add('invalid'); nName.focus(); setStatus('Please enter your name.', 'err'); return; }
        if (!emailOk) { nEmail.classList.add('invalid'); nEmail.focus(); setStatus('Please enter a valid email address.', 'err'); return; }
        if (!nConsent.checked) { setStatus('Please check the box to confirm you agree to be contacted.', 'err'); return; }

        // Honeypot: bots fill this; pretend success and discard
        if (document.getElementById('nCompany').value) { done(); return; }

        if (!FORM_ENDPOINT) {
            var body = 'Please notify me when notary appointments open.\n\nName: ' + name +
                '\nEmail: ' + email + (phone ? '\nPhone: ' + phone : '');
            window.location.href = 'mailto:' + FALLBACK_EMAIL +
                '?subject=' + encodeURIComponent('Notify Me: Notary Launch') +
                '&body=' + encodeURIComponent(body);
            setStatus('Your email app should open with a pre-filled message. Just press send.', 'ok');
            return;
        }

        submitBtn.disabled = true;
        setStatus('Sending\u2026');
        var data = new FormData();
        data.append('name', name);
        data.append('email', email);
        data.append('phone', phone);
        data.append('consent', 'Agreed to be contacted about launch');
        data.append('_subject', 'New launch notification signup');

        fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
            .then(function (r) { if (!r.ok) { throw new Error('bad response'); } done(); })
            .catch(function () {
                setStatus('Sorry, something went wrong. Please email ' + FALLBACK_EMAIL + ' or try again.', 'err');
            })
            .then(function () { submitBtn.disabled = false; });
    });
})();

(function () {
    // Show/hide launch-dependent parts of the page based on BOOKING.open
    var open = !!(window.BOOKING && window.BOOKING.open);
    Array.prototype.forEach.call(document.querySelectorAll('[data-pre-launch]'), function (el) { el.hidden = open; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-post-launch]'), function (el) { el.hidden = !open; });
})();

(function () {
    // Appointment request form
    var C = window.BOOKING;
    var form = document.getElementById('bookForm');
    if (!form || !C) { return; }

    var ENDPOINT = 'https://formspree.io/f/mnppykod';
    var FEE = 10;
    var $ = function (id) { return document.getElementById(id); };
    var dateEl = $('bDate'), timeEl = $('bTime'), statusEl = $('bStatus'), submitBtn = $('bSubmit');
    var mobileBox = $('bMobile'), est = $('bEst');

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function toMin(s) { var p = s.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
    function label(m) { var h = Math.floor(m / 60); return ((h % 12) || 12) + ':' + pad(m % 60) + ' ' + (h >= 12 ? 'PM' : 'AM'); }
    function money(n) { return '$' + n.toFixed(2); }
    function niceDate(v) {
        return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    function isMobile() { return form.elements.service.value.indexOf('Mobile') === 0; }
    function setStatus(text, cls) { statusEl.textContent = text; statusEl.className = 'form-status ' + (cls || ''); }

    // Allowed date range
    var minD = new Date(); minD.setDate(minD.getDate() + C.minLeadDays);
    var minStr = ymd(minD);
    if (C.earliestDate && C.earliestDate > minStr) { minStr = C.earliestDate; }
    var maxD = new Date(); maxD.setDate(maxD.getDate() + C.maxAdvanceDays);
    var maxStr = ymd(maxD);
    dateEl.min = minStr;
    dateEl.max = maxStr;

    function dateProblem(v) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { return 'Please choose a date.'; }
        if (v < minStr) { return 'Please choose a date on or after ' + niceDate(minStr) + '.'; }
        if (v > maxStr) { return 'Please choose a date within the next ' + C.maxAdvanceDays + ' days.'; }
        if (C.blockedDates.indexOf(v) !== -1) { return 'That date is not available. Please choose another.'; }
        return '';
    }

    function fillTimes() {
        var v = dateEl.value, prev = timeEl.value;
        timeEl.innerHTML = '';
        if (!v || dateProblem(v)) {
            timeEl.disabled = true;
            timeEl.appendChild(new Option(v ? 'Choose an available date' : 'Select a date first', ''));
            return;
        }
        var dow = new Date(v + 'T00:00:00').getDay();
        var rule = (dow === 0 || dow === 6) ? C.weekend : C.weekday;
        timeEl.disabled = false;
        timeEl.appendChild(new Option('Select a time', ''));
        for (var m = toMin(rule.start); m <= toMin(rule.lastStart); m += C.stepMinutes) {
            timeEl.appendChild(new Option(label(m), pad(Math.floor(m / 60)) + ':' + pad(m % 60)));
        }
        timeEl.value = prev;
        if (timeEl.selectedIndex < 0) { timeEl.selectedIndex = 0; }
    }

    function updateEst() {
        var s = Math.max(1, Math.floor(parseFloat($('bSigs').value)) || 1);
        var html = 'Estimated notarization fee (due at signing): <strong>' + money(s * FEE) + '</strong>';
        if (isMobile()) {
            var c = $('bCounty').value;
            if (c === 'Gaston') {
                html += '<br>Estimated travel fee (due in advance to confirm): <strong>$25.00</strong> (Gaston County flat rate)';
            } else if (c === 'Other') {
                html += '<br>Estimated travel fee (due in advance to confirm): <strong>$45.00</strong> (Extended NC travel flat rate)';
            } else if (c === 'Specialty') {
                html += '<br>Estimated specialty visit (due in advance to confirm): <strong>Starting at $125.00</strong> (Includes travel &amp; standard execution)';
            }
        }
        est.innerHTML = html;
    }

    function syncService() { mobileBox.hidden = !isMobile(); updateEst(); }

    Array.prototype.forEach.call(form.elements.service, function (r) { r.addEventListener('change', syncService); });
    dateEl.addEventListener('input', fillTimes);
    dateEl.addEventListener('change', fillTimes);
    $('bSigs').addEventListener('input', updateEst);
    if ($('bCounty')) { $('bCounty').addEventListener('change', updateEst); }
    fillTimes();
    syncService();

    function fail(el, msg) { if (el) { el.classList.add('invalid'); el.focus(); } setStatus(msg, 'err'); }

    function done(msg) {
        form.reset();
        syncService();
        fillTimes();
        setStatus(msg, 'ok');
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        Array.prototype.forEach.call(form.querySelectorAll('.invalid'), function (i) { i.classList.remove('invalid'); });

        var mobile = isMobile();
        var name = $('bName').value.trim();
        var email = $('bEmail').value.trim();
        var phone = $('bPhone').value.trim();
        var sigs = parseInt($('bSigs').value, 10);
        var date = dateEl.value;
        var time = timeEl.value;
        var problem;

        if (!name) { return fail($('bName'), 'Please enter your name.'); }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { return fail($('bEmail'), 'Please enter a valid email address.'); }
        if (phone.replace(/\D/g, '').length < 10) { return fail($('bPhone'), 'Please enter a phone number with area code.'); }
        if (!(sigs >= 1)) { return fail($('bSigs'), 'Please enter the number of signatures (at least 1).'); }
        problem = dateProblem(date);
        if (problem) { return fail(dateEl, problem); }
        if (!time) { return fail(timeEl, 'Please choose a start time.'); }

        var address = '', city = '', county = 'Gaston';
        if (mobile) {
            address = $('bAddress').value.trim();
            city = $('bCity').value.trim();
            county = $('bCounty').value;
            if (!address) { return fail($('bAddress'), 'Please enter the signing address.'); }
            if (!city) { return fail($('bCity'), 'Please enter the city.'); }
            if (!$('bNC').checked) { return fail(null, 'Mobile appointments are only available for signings located in North Carolina. Please check the box to confirm.'); }
        }
        if (!$('bConsent').checked) { return fail(null, 'Please check the box to confirm you understand and agree.'); }

        // Honeypot: bots fill this; pretend success and discard
        if ($('bCompany').value) { done('Thank you! Your request has been received.'); return; }

        var timeText = timeEl.options[timeEl.selectedIndex].text;
        var data = new FormData();
        data.append('service', form.elements.service.value);
        data.append('name', name);
        data.append('email', email);
        data.append('phone', phone);
        data.append('signatures', String(sigs));
        data.append('requested_date', niceDate(date));
        data.append('requested_time', timeText);
        data.append('estimated_notarization_fee', money(sigs * FEE));
        if (mobile) {
            var travelFeeStr = '$25.00 (Gaston County)';
            if (county === 'Other') { travelFeeStr = '$45.00 (Outside Gaston County)'; }
            else if (county === 'Specialty') { travelFeeStr = 'Starting at $125.00 (Specialty visit)'; }

            data.append('signing_address', address + ', ' + city + ', NC');
            data.append('county_tier', county);
            data.append('estimated_travel_fee_due_in_advance', travelFeeStr);
            data.append('signing_in_nc', 'Yes');
        }
        data.append('documents', $('bDocs').value.trim());
        data.append('notes', $('bNotes').value.trim());
        data.append('consent', 'Understands this is a request and agrees to be contacted');
        data.append('_subject', 'Appointment request: ' + niceDate(date) + ' at ' + timeText + ' (' + (mobile ? 'Mobile' : 'In-office') + ')');

        submitBtn.disabled = true;
        setStatus('Sending\u2026');
        fetch(ENDPOINT, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } })
            .then(function (r) {
                if (!r.ok) { throw new Error('bad response'); }
                done('Thank you! Your request has been received. I\u2019ll reply by email to confirm' + (mobile ? ' and send instructions for the advance travel fee payment.' : '.'));
            })
            .catch(function () {
                setStatus('Sorry, something went wrong. Please email info@myncnotary.com or call/text (980) 291-3713.', 'err');
            })
            .then(function () { submitBtn.disabled = false; });
    });
})();

(function () {
    var btn = document.getElementById('apptBtn');
    var msg = document.getElementById('apptMsg');
    btn.addEventListener('click', function () {
        if (window.BOOKING && window.BOOKING.open) {
            window.location.hash = 'book';
            return;
        }
        msg.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    });
})();