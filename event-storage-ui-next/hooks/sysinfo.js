import {useEffect, useState} from 'react';
import { io } from "socket.io-client";

function getLoad({ load, loadUser, loadSystem, loadNice, loadIdle, loadIrq }) {
	return { load, loadUser, loadSystem, loadNice, loadIdle, loadIrq };
}

function getCurrentLoad({ currentLoad, currentLoadUser, currentLoadSystem, currentLoadNice, currentLoadIdle, currentLoadIrq }) {
	return {
		load: currentLoad,
		loadUser: currentLoadUser,
		loadSystem:currentLoadSystem,
		loadNice: currentLoadNice,
		loadIdle: currentLoadIdle,
		loadIrq: currentLoadIrq
	};
}

function getMem({ total, free, used }) {
	return { total, free, used };
}

/**
 * @returns {{fsStats: null, fsSize: null, mem: null, processLoad: null, history: {mem: array<{ total: number, free: number, used: number }>, cpus?: array<array<{ load, loadUser, loadSystem, loadNice, loadIdle, loadIrq }>>, cpu: array<{ load, loadUser, loadSystem, loadNice, loadIdle, loadIrq }>}, networkStats: null, currentLoad: null}}
 */
export default function useSysinfo() {
	const [sysinfo, setSysinfo] = useState({
		fsSize: null,
		fsStats: null,
		currentLoad: null,
		processLoad: null,
		mem: null,
		networkStats: null,
		history: {
			cpu: [],
			cpus: null,
			mem: []
		}
	});
	useEffect(() => {
		fetch('/api/sysinfo').finally(() => {
			const socket = io();

			socket.on('connect', () => {
				console.log('connect');
			});

			socket.on('data', data => {
				setSysinfo(sysinfo => {
					const cpu = sysinfo.history.cpu.concat(getCurrentLoad(data.currentLoad)).slice(-20);
					const cpus = sysinfo.history.cpus?.map(
						(cpu, index) => cpu.concat(getLoad(data.currentLoad.cpus[index])).slice(-20)
					) || data.currentLoad.cpus.map(cpu => [getLoad(cpu)]);
					const mem = sysinfo.history.mem.concat(getMem(data.mem)).slice(-20);
					return { ...data, history: { cpu, cpus, mem } };
				});
			});
		});
	}, []); // Added [] as useEffect filter so it will be executed only once, when component is mounted

	return sysinfo;
}
