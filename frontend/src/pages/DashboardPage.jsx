/**
 * DashboardPage.jsx
 *
 * Thin route wrapper around the existing App component.
 * Keeps the router layer decoupled from App internals.
 */

import React from 'react';
import App from '../App.jsx';

export default function DashboardPage() {
  return <App />;
}
