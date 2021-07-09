import { Server } from 'socket.io';

const ioHandler = (req, res) => {
	if (!res.socket.server.io) {
		const si = require('systeminformation');
		console.log('*First use, starting socket.io');

		const io = new Server(res.socket.server);

		function getSysInfo() {
			return Promise.all([
				si.fsSize(),
				si.fsStats(),
				si.currentLoad(),
				si.processLoad('node'),
				si.mem(),
				si.networkStats()
			]).then(data => {
				const [fsSize, fsStats, currentLoad, processLoad, mem, networkStats] = data;
				return {
					fsSize,
					fsStats,
					currentLoad,
					processLoad,
					mem,
					networkStats
				};
			});
		}

		/**
		 * @returns {number} An setInterval reference
		 */
		function watchSysInfo() {
			getSysInfo().then(data => io.emit('data', data));
			return setInterval(() => {
				getSysInfo().then(data => io.emit('data', data));
			}, 10000);
		}

		let refreshInterval;

		let clientsCount = 0;
		io.on('connection', socket => {
			if (clientsCount === 0 && !refreshInterval) {
				console.log('Starting watching sysinfo...');
				refreshInterval = watchSysInfo();
			}
			clientsCount++;

			socket.on('disconnect', reason => {
				clientsCount--;
				if (clientsCount === 0 && refreshInterval) {
					console.log('Stopping watching sysinfo...');
					clearInterval(refreshInterval);
					refreshInterval = null;
				}
			});
		});

		res.socket.server.io = io;
	} else {
		console.log('socket.io already running');
	}
	res.end();
}

export const config = {
	api: {
		bodyParser: false
	}
};

export default ioHandler;