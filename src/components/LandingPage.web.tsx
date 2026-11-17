import React, {useState} from 'react';

const logo = require('../assets/aries-logo.png') as string;
const industries = [
  ['Maritime', 'ship', 'Container ship at sea'],
  ['Offshore', 'offshore', 'Offshore drilling platform at sunset'],
  ['Oil & Gas', 'plant', 'Oil and gas processing plant'],
  ['Renewables', 'wind', 'Wind turbines at sunset'],
  ['Aviation', 'plane', 'Commercial aircraft on a runway'],
  ['Petrochemical', 'flask', 'Petrochemical facility with storage tanks'],
  ['Civil', 'bridge', 'Cable-stayed bridge crossing water'],
  ['Industrial', 'robot', 'Industrial robotic arm in a factory'],
] as const;
const features = [
  ['calendar', 'Plan & Schedule', 'Manage surveys, inspections, and resources efficiently.'],
  ['tablet', 'Capture & Collaborate', 'Capture field data, evidence, and findings.'],
  ['layers', 'Analyze & Report', 'Generate structured reports and inspection insights.'],
  ['shield', 'Ensure Compliance', 'Support safety, verification, and compliance workflows.'],
  ['network', 'Integrate & Scale', 'Support connected industrial operations and future integrations.'],
] as const;
const workflow = [
  ['calendar', 'Plan', 'Define project scope, assets, and schedule.'],
  ['tablet', 'Execute', 'Perform inspections and capture findings.'],
  ['check', 'Review', 'Validate inspection results and manage actions.'],
  ['chart', 'Report', 'Generate structured inspection reports.'],
  ['layers', 'Maintain', 'Track corrective actions and asset condition.'],
] as const;
const paths: Record<string, string> = {
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M8 14h2 M14 14h2',
  tablet: 'M6 3h12v18H6z M11 18h2',
  layers: 'M12 3l9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  network: 'M10 3h4v4h-4z M3 17h4v4H3z M17 17h4v4h-4z M12 7v5 M5 17v-5h14v5',
  chart: 'M4 20v-5h3v5z M10 20V9h3v11z M16 20V4h3v16z',
  check: 'M21 12a9 9 0 1 1-9-9 M8 12l3 3 9-9',
  cloud: 'M6 18h12a4 4 0 1 0-1-8 5 5 0 0 0-10-1 4.5 4.5 0 0 0-1 9z',
  login: 'M11 4h8v16h-8 M3 12h12 M11 8l4 4-4 4',
  user: 'M13 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M2 21v-3a7 7 0 0 1 12-4 M19 13v8 M15 17h8',
  ship: 'M3 14l9-4 9 4-3 5H6z M7 12V7h10v5 M10 7V4h4v3 M3 22c3-2 6 2 9 0s6 2 9 0',
  offshore: 'M3 14h18 M6 14l-2 7 M18 14l2 7 M8 14l4-11 4 11 M10 9h4',
  plant: 'M3 20V10l6 4v-4l6 4v6z M16 20V5h4v15 M15 20h7',
  wind: 'M12 11v10 M12 11l-2-8 M12 11l8 1 M12 11l-6 6',
  plane: 'M12 3v17 M12 7l8 7v2l-8-3-8 3v-2z M9 21l3-3 3 3',
  flask: 'M9 3h6 M10 3v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3 M8 15h8',
  bridge: 'M3 17h18 M7 5v15 M17 5v15 M3 15l4-8 5 8 5-8 4 8',
  robot: 'M3 21h14 M6 21v-4l5-5 4 3 M11 12l-3-4 5-5 4 4-3 3 M17 7l4 3-2 3',
};
function Icon({name}: {name: string}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

const nav = [
  ['Home', 'home'], ['Solutions', 'solutions'], ['Industries', 'industries'],
  ['Platform', 'platform'], ['Resources', 'workflow'], ['Company', 'company'],
];
const asset = (index: number) => require(`../assets/landing/industry-${index + 1}.jpg`) as string;

export default function LandingPage({onLogin, onRegister}: {onLogin: () => void; onRegister?: () => void}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = () => <div className="ex-landing-actions">
    <button type="button" className="ex-landing-login" onClick={onLogin}>Login</button>
    {onRegister && <button type="button" className="ex-landing-register" onClick={onRegister}>Register</button>}
  </div>;
  return <div className="ex-landing" id="home">
    <a className="ex-landing-skip" href="#landing-main">Skip to content</a>
    <header className="ex-landing-header">
      <div className="ex-landing-bar">
        <a href="#home" className="ex-landing-brand" onClick={() => setMenuOpen(false)}>
          <img src={logo} width="43" height="32" alt="" /><strong>Ex-Survey</strong>
          <span>Industrial Survey &amp; Inspection Platform</span>
        </a>
        <button type="button" className="ex-landing-menu" aria-expanded={menuOpen} aria-controls="landing-navigation"
          onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={menuOpen ? 'M5 5l14 14M19 5L5 19' : 'M3 6h18M3 12h18M3 18h18'} /></svg>
        </button>
        <div id="landing-navigation" className={menuOpen ? 'ex-landing-nav is-open' : 'ex-landing-nav'} onKeyDown={event => {
          if (event.key === 'Escape') {
            setMenuOpen(false);
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.ex-landing-menu')?.focus();
          }
        }}>
          <nav aria-label="Landing page">{nav.map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
        </div>
        {auth()}
      </div>
    </header>

    <main id="landing-main" tabIndex={-1}>
      <section className="ex-landing-hero" aria-labelledby="landing-title">
        <div className="ex-landing-hero-inner">
          <div className="ex-landing-intro">
            <h1 id="landing-title">Unified Survey &amp; Inspection for <em>Industrial Assets</em></h1>
            <ul className="ex-landing-benefits">
              {[
                ['shield', 'Enterprise-Grade & Secure'], ['cloud', 'End-to-End Inspection Lifecycle'],
                ['chart', 'Asset Visibility & Risk Insight'], ['layers', 'Scalable Across Global Operations'],
              ].map(([icon, label]) => <li key={icon}><Icon name={icon} /><span>{label}</span></li>)}
            </ul>
          </div>
          <div className="ex-landing-art">
            <div className="ex-landing-globe" aria-hidden="true" />
            <div className="ex-landing-orbits" aria-hidden="true" />
            <div className="ex-landing-fleet">{industries.map(([name, , alt], index) =>
              <figure className="ex-landing-float" key={name} style={{'--sector': index} as React.CSSProperties}>
                <div><img src={asset(index)} width="512" height="341" alt={alt} decoding="async" /></div>
                <figcaption>{name}</figcaption>
              </figure>)}</div>
          </div>
        </div>
      </section>

      <div className="ex-landing-strip" id="industries" role="region" aria-label="Industry sectors" tabIndex={0}>
        <ul>{industries.map(([name]) => <li key={name}>{name}</li>)}</ul>
      </div>

      <section className="ex-landing-platform" id="platform">
        <div className="ex-landing-platform-inner">
          <div><span className="ex-landing-kicker">Platform Highlights</span><h2>A Modern Inspection Platform for Industrial Operations</h2></div>
          <ul>{features.map(([icon, title, description]) => <li key={title}><Icon name={icon} /><h3>{title}</h3><p>{description}</p></li>)}</ul>
        </div>
      </section>

      <section className="ex-landing-sectors" id="solutions">
        <div className="ex-landing-sectors-inner">
          <div><span className="ex-landing-kicker">Industry Solutions</span><h2>Built for Your Industry</h2>
            <p>Purpose-built survey and inspection workflows for diverse industrial assets and operating environments.</p></div>
          <ul>{industries.map(([name, icon], index) => <li key={name}>
            <img src={asset(index)} alt="" width="512" height="341" loading="lazy" decoding="async" />
            <span><Icon name={icon} /><strong>{name}</strong></span>
          </li>)}</ul>
        </div>
      </section>

      <div className="ex-landing-close">
        <section className="ex-landing-about" id="company">
          <img src={asset(8)} alt="Industrial surveyor using a tablet aboard a vessel near an offshore installation" width="512" height="341" loading="lazy" decoding="async" />
          <div><span className="ex-landing-kicker">About Ex-Survey</span><h2>Digitalizing Industrial Surveys &amp; Inspections</h2>
            <p>Ex-Survey brings people, processes, and asset data together in a single connected platform — helping organizations manage safer, more compliant, and more efficient industrial inspections.</p></div>
        </section>
        <section className="ex-landing-workflow" id="workflow">
          <span className="ex-landing-kicker">Inspection Workflow</span><h2>A Simple, End-to-End Workflow</h2>
          <ol>{workflow.map(([icon, title, description], index) => <li key={title}>
            <span className="ex-landing-step-icon"><Icon name={icon} /></span>
            <h3>{index + 1}. {title}</h3><p>{description}</p>
          </li>)}</ol>
        </section>
      </div>
    </main>
    <footer className="ex-landing-footer"><strong>Ex-Survey</strong><span>Industrial Survey &amp; Inspection Platform</span><a href="#home">Back to top ↑</a></footer>
  </div>;
}
