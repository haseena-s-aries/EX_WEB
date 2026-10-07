import React from 'react';
import Renderer from 'react-test-renderer';
import {TextInput, TouchableOpacity} from 'react-native';
import OurCompanySection, {matchingCompanies} from '../src/components/OurCompanySection';
import {getCompanies} from '../src/api/companies';
jest.mock('../src/api/companies', () => ({getCompanies: jest.fn()}));
jest.mock('../src/components/AuthenticatedImage', () => 'CompanyLogo');
const companies = [
  {id: 'DF', companyName: 'ARIES MARINE', displayName: 'Aries - DF', address: 'DF address', email: 'design@example.com', website: 'www.example.com', logoUrl: '/logo'},
  {id: 'DN', companyName: 'ARIES MARINE', displayName: 'Aries - DN', address: 'DN address', email: 'other@example.com', website: 'www.other.com'},
];
const text = (node: Renderer.ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
test('search preserves separate rows with the same company name', () => {
  expect(matchingCompanies(companies, 'aries')).toHaveLength(2);
  expect(matchingCompanies(companies, 'DN').map(c => c.id)).toEqual(['DN']);
});
test('selection loads contacts from that row and search does not refetch', async () => {
  (getCompanies as jest.Mock).mockResolvedValue({data: companies}); const change = jest.fn(); let renderer!: Renderer.ReactTestRenderer;
  const start = (getCompanies as jest.Mock).mock.calls.length;
  await Renderer.act(async () => {renderer = Renderer.create(<OurCompanySection value="DF" onChange={change} />);});
  expect(text(renderer.root)).toContain('design@example.com'); expect(text(renderer.root)).not.toContain('other@example.com');
  await Renderer.act(async () => renderer.root.findByType(TextInput).props.onChangeText('DN'));
  expect((getCompanies as jest.Mock).mock.calls.length - start).toBe(1);
  const option = renderer.root.findAllByType(TouchableOpacity).find(n => text(n) === 'Aries - DN')!;
  await Renderer.act(async () => option.props.onPress()); expect(change).toHaveBeenCalledWith('DN');
  await Renderer.act(async () => renderer.update(<OurCompanySection value="DN" onChange={change} />));
  expect(text(renderer.root)).toContain('other@example.com'); expect(text(renderer.root)).not.toContain('design@example.com');
  expect(text(renderer.root)).toContain('No logo available');
  await Renderer.act(async () => renderer.unmount());
});
test('details show previously saved selection without loading the dropdown API', async () => {
  const start = (getCompanies as jest.Mock).mock.calls.length; let renderer!: Renderer.ReactTestRenderer;
  await Renderer.act(async () => {renderer = Renderer.create(<OurCompanySection value="DF" existing={companies[0]} />);});
  expect(text(renderer.root)).toContain('Aries - DF'); expect(text(renderer.root)).toContain('DF address');
  expect((getCompanies as jest.Mock).mock.calls.length).toBe(start);
  await Renderer.act(async () => renderer.unmount());
});
