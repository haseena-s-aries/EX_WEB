import React from 'react';
import Renderer from 'react-test-renderer';
import apiClient from '../src/api/client';
import HazardousAreaPlanViewer from '../src/components/HazardousAreaPlanViewer.web';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
  getApiResourceUrl: (path: string) => path,
}));
const textOf = (node: Renderer.ReactTestInstance): string =>
  node.children
    .map(child => (typeof child === 'string' ? child : textOf(child)))
    .join('');
beforeEach(() => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: { original: true } });
  (globalThis as any).URL = {
    createObjectURL: jest.fn(() => 'blob:original-plan'),
    revokeObjectURL: jest.fn(),
  };
  (globalThis as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
});
test('fits original image without stretching and supports full resolution zoom and scrolling', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(
      <HazardousAreaPlanViewer
        path="/api/projects/1/hazardous-area-plan"
        fileName="plan.jpg"
        contentType="image/jpeg"
        onClose={jest.fn()}
      />,
      { createNodeMock: () => ({ clientWidth: 1024, clientHeight: 624 }) },
    );
  });
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api/projects/1/hazardous-area-plan',
    expect.objectContaining({ responseType: 'blob' }),
  );
  await Renderer.act(async () => {
    renderer.root
      .findByType('img')
      .props.onLoad({ target: { naturalWidth: 4000, naturalHeight: 2000 } });
  });
  expect(renderer.root.findByType('img').props.style).toEqual(
    expect.objectContaining({ width: 1000, height: 500, objectFit: 'contain' }),
  );
  await Renderer.act(async () => {
    renderer.root
      .findAllByType('button')
      .find(b => textOf(b) === '100% original size')!
      .props.onClick();
  });
  expect(renderer.root.findByType('img').props.style.width).toBe(4000);
  expect(
    renderer.root
      .findAllByType('div')
      .some(div => div.props.style?.overflow === 'auto'),
  ).toBe(true);
  await Renderer.act(async () => {
    renderer.root
      .findAllByType('button')
      .find(b => textOf(b) === 'Fit to screen')!
      .props.onClick();
  });
  expect(renderer.root.findByType('img').props.style.width).toBe(1000);
  await Renderer.act(async () => {
    renderer.unmount();
  });
  expect((globalThis as any).URL.revokeObjectURL).toHaveBeenCalledWith(
    'blob:original-plan',
  );
});
test('PDF uses the original blob in the browser PDF viewer', async () => {
  let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {
    renderer = Renderer.create(
      <HazardousAreaPlanViewer
        path="/api/projects/1/hazardous-area-plan"
        fileName="plan.pdf"
        contentType="application/pdf"
        onClose={jest.fn()}
      />,
    );
  });
  expect(renderer.root.findByType('iframe').props.src).toBe(
    'blob:original-plan#view=FitH',
  );
  expect(renderer.root.findAllByType('img')).toHaveLength(0);
  await Renderer.act(async () => {
    renderer.unmount();
  });
});
