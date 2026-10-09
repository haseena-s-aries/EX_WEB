/** @format */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
// Keep this app-shell smoke test independent of native navigation/file/PDF bindings.
// Role navigation and the actual client workflow have their own tests.
jest.mock('../src/navigation/AppNavigator', () => 'AppNavigator');
test('renders correctly', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {renderer = ReactTestRenderer.create(<App />);});
  await ReactTestRenderer.act(() => renderer.unmount());
});
