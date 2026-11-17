import React, {useState} from 'react';
import Renderer, {act} from 'react-test-renderer';
import {Image} from 'react-native';
import ClientLogoUpload from '../src/components/ClientLogoUpload.web';
test('company logo creates a PNG preview and revokes its local URL when removed', async () => {
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:client-company-logo'); URL.revokeObjectURL = jest.fn();
  const Wrapper = () => {const [value, setValue] = useState<any>(null); return <ClientLogoUpload value={value} onChange={setValue} />;};
  let ui!: Renderer.ReactTestRenderer;
  await act(async () => {ui = Renderer.create(<Wrapper />);});
  await act(async () => {ui.root.findByType('input' as any).props.onChange({target: {files: [{name: 'company.png', type: 'image/png'}], value: 'company.png'}});});
  expect(ui.root.findAllByType(Image).find(n => n.props.accessibilityLabel === 'Client Company Logo preview')?.props.source.uri).toBe('blob:client-company-logo');
  await act(async () => {ui.unmount();}); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:client-company-logo');
  URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
});
