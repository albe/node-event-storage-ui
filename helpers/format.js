
const MINUTES = 60;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const WEEKS = 7 * DAYS;
const MONTHS = 30 * DAYS;
const YEARS = 365 * DAYS;

/**
 * Format an amount of seconds as a string in the format `
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimeAgo(seconds) {
	switch (true) {
		case seconds < 0:
			return 'never';
		case seconds < 2:
			return 'a second ago';
		case seconds < 2 * MINUTES:
			return Math.floor(seconds) + ' seconds ago';
		case seconds < 2 * HOURS:
			return Math.floor(seconds / MINUTES) + ' minutes ago';
		case seconds < 2 * DAYS:
			return Math.floor(seconds / HOURS) + ' hours ago';
		case seconds < 2 * WEEKS:
			return Math.floor(seconds / DAYS) + ' days ago';
		case seconds < 2 * MONTHS:
			return Math.floor(seconds / WEEKS) + ' weeks ago';
		case seconds < 2 * YEARS:
			return Math.floor(seconds / MONTHS) + ' months ago';
		default:
			return Math.floor(seconds / YEARS) + ' years ago';
	}
}
