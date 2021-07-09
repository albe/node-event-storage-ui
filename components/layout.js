import Head from 'next/head';
import Link from 'next/link';
import 'material-dashboard-dark-edition/assets/css/material-dashboard.css';

export default function Layout({ children, home }) {
	return (<div className="dark-edition">
			<Head>
				<title>event-storage-ui</title>

				<meta charSet="utf-8"/>
				<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" name="viewport"/>
				<meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1"/>

				<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"/>
				<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css"/>
			</Head>

			<div className="wrapper" style={{overflow:"auto"}}>
				<div className="main-panel" style={{width:'100%'}}>
					<nav className="navbar navbar-expand-lg bg-info navbar-absolute fixed-top ">
						<div className="container-fluid">
							<div className="navbar-wrapper" style={{height:40}}>
								<img src="/logo_white.png" style={{width:"auto",height:"100%"}} alt="* event-storage" />
							</div>
							<button className="navbar-toggler" type="button" data-toggle="collapse" aria-controls="navigation-index" aria-expanded="false" aria-label="Toggle navigation">
								<span className="sr-only">Toggle navigation</span>
								<span className="navbar-toggler-icon icon-bar"></span>
								<span className="navbar-toggler-icon icon-bar"></span>
								<span className="navbar-toggler-icon icon-bar"></span>
							</button>
							<div className="collapse navbar-collapse justify-content-end">
								<ul className="navbar-nav">
									<li className="nav-item">
										<Link href="/">
											<a className="btn btn-info" role="button"><i className="material-icons">dashboard</i> Dashboard</a>
										</Link>
									</li>
									<li className="nav-item">
										<Link href="/streams">
											<a className="btn btn-info" role="button"><i className="material-icons">table_rows</i> Stream Browser</a>
										</Link>
									</li>
									<li className="nav-item">
										<Link href="/consumers">
											<a className="btn btn-info" role="button"><i className="material-icons">restore_page</i> Consumers</a>
										</Link>
									</li>
								</ul>
							</div>
						</div>
					</nav>

					<div className="content">
						<div className="container-fluid">
							{children}
						</div>
					</div>
					<footer className="footer">
						<div className="container-fluid">
							<nav className="float-left">
								<ul>
									<li>
										<a href="https://www.creative-tim.com">
											Creative Tim
										</a>
									</li>
								</ul>
							</nav>
							<div className="copyright float-right">
								&copy;
								{(new Date()).getFullYear()}
								, made with <i className="material-icons">favorite</i> by
								<a href="https://www.creative-tim.com" target="_blank">Creative Tim</a> for a better
								web.
							</div>
						</div>
					</footer>
				</div>
			</div>

			<script src="/assets/js/core/jquery.min.js"></script>
			<script src="/assets/js/core/popper.min.js"></script>
			<script src="/assets/js/core/bootstrap-material-design.min.js"></script>
			<script src="/assets/js/material-dashboard.min.js?v=2.1.0"></script>
		</div>);
}