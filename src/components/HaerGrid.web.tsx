import {visual} from '../theme/visual';
import React from 'react';
import type {HaerGridProps} from './HaerGrid';

export default function HaerGrid({columns, rows, colors, label = 'HAER register', fullWidth = false, columnGroup}: HaerGridProps) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  function pinned(index: number): React.CSSProperties {
    if (fullWidth || index > 1) return {};
    return {position: 'sticky', left: index === 0 ? 0 : columns[0].width, zIndex: 2};
  }
  const cell: React.CSSProperties = {borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, verticalAlign: 'top', padding: 10, boxSizing: 'border-box', overflowWrap: 'anywhere'};
  return <div className="ex-grid" role="region" aria-label={`${label} table`} tabIndex={0} style={{overflow: 'auto', maxHeight: '65vh', border: `1px solid ${colors.border}`, borderRadius: visual.radius.panel}}>
    <table aria-label={label} style={{width: fullWidth ? '100%' : totalWidth, minWidth: totalWidth, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, color: colors.text, fontFamily: visual.body}}>
      <colgroup>{columns.map((column, index) => <col key={index} style={{width: column.width}} />)}</colgroup>
      <thead>
        <tr>{columns.map((column, index) => {
          const inGroup = columnGroup && index >= columnGroup.start && index < columnGroup.start + columnGroup.count;
          if (inGroup && index !== columnGroup.start) return null;
          return <th key={index} scope={inGroup ? 'colgroup' : 'col'} colSpan={inGroup ? columnGroup.count : undefined}
            rowSpan={columnGroup && !inGroup ? 2 : undefined} style={{
              ...cell, ...pinned(index), position:'sticky',top:0,zIndex:index<2?4:3,
              background: visual.rail,color:'#ebf8fa',fontFamily: visual.mono,letterSpacing: .45,fontSize: 11,textAlign:inGroup?'center':'left',verticalAlign:'middle',height:columnGroup?32:46,
            }}>{inGroup ? columnGroup.label : column.label}</th>;
        })}</tr>
        {columnGroup && <tr>{columns.slice(columnGroup.start,columnGroup.start+columnGroup.count).map(column =>
          <th scope="col" key={column.label} style={{...cell,position:'sticky',top:32,zIndex:3,background: visual.rail,color:'#ebf8fa',fontFamily: visual.mono,letterSpacing: .45,fontSize: 11,height:32}}>
            {column.label}
          </th>)}</tr>}
      </thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={row.id} tabIndex={row.onPress ? 0 : undefined}
        onKeyDown={row.onPress ? event => {
          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            row.onPress?.();
          }
        } : undefined}
        onClick={row.onPress ? event => {
        if (!(event.target instanceof Element) || !event.target.closest('button, input, a, [role="button"], [role="checkbox"]')) row.onPress?.();
      } : undefined} style={row.onPress ? {cursor: 'pointer'} : undefined}>{row.cells.map((value, index) =>
        <td key={index} style={{...cell, ...pinned(index), backgroundColor: row.selected ? colors.elevated : rowIndex % 2 ? colors.bg : colors.card}}>{value}</td>,
      )}</tr>)}</tbody>
    </table>
  </div>;
}
