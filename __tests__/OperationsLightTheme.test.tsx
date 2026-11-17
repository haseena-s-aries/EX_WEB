import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {StyleSheet,Text,TouchableOpacity} from 'react-native';
import Sidebar from '../src/components/Sidebar';
import {LIGHT} from '../src/theme/palette';
let mockMode='light';
jest.mock('../src/theme/useThemeMode',()=>({useThemeMode:()=>mockMode}));
jest.mock('../src/components/QcPendingBadge',()=> 'QcPendingBadge');
let ui:Renderer.ReactTestRenderer;
afterEach(async()=>{await act(async()=>ui?.unmount());});
test.each(['Admin','Manager','Surveyor'])('%s light sidebar uses the Client light palette and preserves navigation',async role=>{
 mockMode='light';const navigate=jest.fn();
 await act(async()=>{ui=Renderer.create(<Sidebar userRole={role} active="Dashboard" workspaceColor={LIGHT.bar} operationsStyle onSettings={jest.fn()} onNavigate={navigate} onLogout={jest.fn()}/>);});
 const brand=ui.root.findAllByType(Text).find(n=>n.props.children==='Ex-Survey')!;
 expect(StyleSheet.flatten(brand.props.style).color).toBe(LIGHT.text);
 expect(ui.root.findAll(n=>n.props.nativeID==='ex-operations-sidebar-photo')).toHaveLength(0);
 const selected=ui.root.findAllByType(TouchableOpacity).find(n=>n.props.nativeID==='ex-operations-selected-nav')!;
 expect(StyleSheet.flatten(selected.props.style).backgroundColor).toBe(LIGHT.cyan+'24');
 await act(async()=>selected.props.onPress());expect(navigate).toHaveBeenCalledWith('Dashboard');
});
test('dark operations sidebar retains its white brand and industrial image',async()=>{
 mockMode='dark';await act(async()=>{ui=Renderer.create(<Sidebar userRole="Admin" active="Dashboard" workspaceColor="#02172A" operationsStyle onSettings={jest.fn()} onNavigate={jest.fn()} onLogout={jest.fn()}/>);});
 expect(StyleSheet.flatten(ui.root.findAllByType(Text).find(n=>n.props.children==='Ex-Survey')!.props.style).color).toBe('#ffffff');
 expect(ui.root.findAll(n=>n.props.nativeID==='ex-operations-sidebar-photo').length).toBeGreaterThan(0);
});
