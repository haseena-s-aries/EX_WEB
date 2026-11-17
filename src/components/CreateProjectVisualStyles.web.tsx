import React from 'react';

// Scoped to this modal so shared inputs keep their existing appearance elsewhere.
const css = `
#create-project-form [role=heading],
#create-project-form [data-testid="project-form-label"],
#create-project-form label:not([for]) { text-transform: uppercase; }
#create-project-form [data-project-identity] { text-transform: uppercase; }
#create-project-form #project-name-field,
#create-project-form #project-job-number-field,
#create-project-form #project-location-field,
#create-project-form #project-vessel-field,
#ex-project-form-scroll #project-name-field,
#ex-project-form-scroll #project-job-number-field,
#ex-project-form-scroll #project-location-field,
#ex-project-form-scroll #project-vessel-field { text-transform: uppercase; }
#create-project-form input:not([type=file]),
#create-project-form textarea,
#create-project-form select {
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}
#create-project-form input:not([type=file]):hover,
#create-project-form textarea:hover { border-color: #93b8ed; }
#create-project-form input:not([type=file]):focus,
#create-project-form textarea:focus,
#create-project-form select:focus {
  outline: none; border-color: #2563eb; background-color: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,.12);
}
#create-project-form label[for] { transition: background-color 160ms ease, border-color 160ms ease; }
#create-project-form label[for]:hover { background-color: #eff6ff; border-color: #2563eb; }
#create-project-form [role=button] { transition: background-color 160ms ease, box-shadow 160ms ease; }
#create-project-form [role=button]:focus-visible { outline: 2px solid #2563eb; outline-offset: 3px; }
#create-project-cancel:hover { background-color: #eff6ff; border-color: #93b8ed; }
#create-project-submit:not([aria-disabled=true]):hover > div { background-color: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,.24); }
`;

export default function CreateProjectVisualStyles() {
  return React.createElement('style', null, css);
}
