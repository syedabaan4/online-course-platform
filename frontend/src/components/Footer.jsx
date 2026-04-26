import './Footer.css';

const Footer = () => {
	const year = new Date().getFullYear();

	return (
		<footer className="site-footer" role="contentinfo">
			<div className="site-footer__inner">
				<section className="site-footer__hero" aria-labelledby="footer-cta-heading">
					<h2 id="footer-cta-heading" className="site-footer__headline">
						Build your next chapter with us.
					</h2>
					<p className="site-footer__intro">
						Coursly connects curious learners with thoughtful instructors. Browse courses, learn at your pace, and earn certificates
						you can share.
					</p>
				</section>

				<div className="site-footer__rule site-footer__rule--mega" aria-hidden />

				<div className="site-footer__mega" aria-hidden>
					Coursly<span className="site-footer__mega-period">.</span>
				</div>

				<div className="site-footer__rule" aria-hidden />

				<div className="site-footer__bottom">
					<div className="site-footer__social">
						<a href="https://github.com" target="_blank" rel="noopener noreferrer" className="site-footer__social-link">
							GitHub
						</a>
						<a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="site-footer__social-link">
							LinkedIn
						</a>
						<a href="https://x.com" target="_blank" rel="noopener noreferrer" className="site-footer__social-link">
							X
						</a>
					</div>
					<p className="site-footer__copyright">© {year} Coursly</p>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
