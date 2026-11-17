import React from 'react';
import Renderer from 'react-test-renderer';
import ProjectCompanyLogo from '../src/components/ProjectCompanyLogo';
import AuthenticatedImage from '../src/components/AuthenticatedImage';
jest.mock('../src/components/AuthenticatedImage', () => 'AuthenticatedImage');
test('project logos use separate protected endpoints and contain sizing with a neutral fallback', async () => {
  let view!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {view=Renderer.create(<><ProjectCompanyLogo projectId="one"/><ProjectCompanyLogo projectId="two"/></>);});
  const images=view.root.findAllByType(AuthenticatedImage);
  expect(images[0].props.path).toContain('/projects/one/client-logo');
  expect(images[1].props.path).toContain('/projects/two/client-logo');
  for(const image of images) expect(image.props).toMatchObject({resizeMode:'contain',placeholderText:'▦'});
  await Renderer.act(async () => view.unmount());
});
