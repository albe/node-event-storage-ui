module.exports = {
	async rewrites() {
		return [
			{
				source: '/streams/:streamName',
				destination: '/streams/eventstream?direction=forwards',
			},
			{
				source: '/streams/:streamName/:from',
				destination: '/streams/eventstream?direction=forwards',
			},
			{
				source: '/streams/:streamName/:from/forwards/:amount',
				destination: '/streams/eventstream?direction=forwards',
			},
			{
				source: '/streams/:streamName/:from/backwards/:amount',
				destination: '/streams/eventstream?direction=backwards',
			},
			{
				source: '/streams/:streamName/:query*',
				destination: '/streams/eventstream',
			},
			{
				source: '/consumers/:consumerIdentifier',
				destination: '/consumers/consumer',
			},
		]
	},
}