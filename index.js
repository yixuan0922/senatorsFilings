const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

const ROOT = 'https://efdsearch.senate.gov';
const LANDING_PAGE_URL = `${ROOT}/search/home/`;
const SEARCH_PAGE_URL = `${ROOT}/search/`;
const REPORTS_URL = `${ROOT}/search/report/data/`;

const BATCH_SIZE = 100;
const RATE_LIMIT_SECS = 1;

const PDF_PREFIX = '/search/view/paper/';
const LANDING_PAGE_FAIL = 'Failed to fetch filings landing page';

let client = axios.create();

async function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function _csrf() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://efdsearch.senate.gov/search/home/');
    await page.click('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    const cookies = await page.cookies();
    const csrfToken = cookies.find(cookie => cookie.name === 'csrftoken').value;

    await browser.close();

    // fs.writeFileSync('token.txt', csrfToken);
    console.log(csrfToken);
    return csrfToken;
}

// _csrf().catch(console.error);

const instance = axios.create({
    baseURL: ROOT, 
    timeout: 10000, 
    headers: {
        'Referer': SEARCH_PAGE_URL
    }
})


async function reportsApi(client, offset, token) {
    const loginData = {
        start: offset.toString(),
        length: BATCH_SIZE.toString(),
        report_types: '[11]',
        filer_types: '[]',
        submitted_start_date: '12/12/2023 00:00:00',
        submitted_end_date: '',
        candidate_state: '',
        senator_state: '',
        office_id: '',
        first_name: '',
        last_name: '',
        csrfmiddlewaretoken: token
    };

    console.log(`Getting rows starting at ${offset}`);

    // const response = await client.post(REPORTS_URL, loginData, {
    //     headers: { 'Referer': SEARCH_PAGE_URL }
    // });
    const response = await instance.post(REPORTS_URL, loginData);
    return response.data.data;
}

async function senatorReports(client) {
    const token = await _csrf(client);
    let idx = 0;
    let reports = await reportsApi(client, idx, token);
    let allReports = [];
    while (reports.length !== 0) {
        allReports = allReports.concat(reports);
        idx += BATCH_SIZE;
        reports = await reportsApi(client, idx, token);
    }
    console.log(allReports.length)
    return allReports;
}


async function main() {
    await senatorReports(client).catch(console.error);
}

main();







