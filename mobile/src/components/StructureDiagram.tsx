import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

import type { StructureEntity } from '@/api/types';
import { colors, entityRoleColors, fonts, radius } from '@/theme/tokens';

const BOX_W = 156;
const BOX_H = 64;
const GAP_X = 18;
const GAP_Y = 58;
const PAD = 12;

interface Placed {
  entity: StructureEntity;
  x: number;
  y: number;
}

/** Truncate for SVG text, which does not wrap. */
const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Lay the group out as levels: the root (empty `owned_by`) on top, each level of
 * children in a centred row beneath it.
 *
 * The backend normalises the entity list into a single tree before saving, so this
 * only needs to handle a well-formed one — but it still guards against orphans so a
 * bad edge degrades to an extra root rather than an empty diagram.
 */
function layout(entities: StructureEntity[]): { nodes: Placed[]; width: number; height: number } {
  if (entities.length === 0) return { nodes: [], width: 0, height: 0 };

  const childrenOf = new Map<string, StructureEntity[]>();
  for (const entity of entities) {
    const key = entity.owned_by || '';
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), entity]);
  }

  // Depth-first walk so siblings stay adjacent, collecting levels as we go.
  const levels: StructureEntity[][] = [];
  const seen = new Set<number>();

  const walk = (parentName: string, depth: number) => {
    for (const entity of childrenOf.get(parentName) ?? []) {
      if (seen.has(entity.id)) continue;
      seen.add(entity.id);
      levels[depth] = [...(levels[depth] ?? []), entity];
      walk(entity.name, depth + 1);
    }
  };
  walk('', 0);

  // Anything unreachable (a cycle the backend missed) joins the top row.
  for (const entity of entities) {
    if (!seen.has(entity.id)) {
      seen.add(entity.id);
      levels[0] = [...(levels[0] ?? []), entity];
    }
  }

  const rowWidth = (n: number) => n * BOX_W + (n - 1) * GAP_X;
  const widest = Math.max(...levels.map((row) => rowWidth(row.length)));

  const nodes: Placed[] = [];
  levels.forEach((row, depth) => {
    const offset = (widest - rowWidth(row.length)) / 2;
    row.forEach((entity, index) => {
      nodes.push({
        entity,
        x: PAD + offset + index * (BOX_W + GAP_X),
        y: PAD + depth * (BOX_H + GAP_Y),
      });
    });
  });

  return {
    nodes,
    width: widest + PAD * 2,
    height: levels.length * BOX_H + (levels.length - 1) * GAP_Y + PAD * 2,
  };
}

export function StructureDiagram({ entities }: { entities: StructureEntity[] }) {
  const { nodes, width, height } = layout(entities);
  if (nodes.length === 0) return null;

  const byName = new Map(nodes.map((n) => [n.entity.name, n]));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <View>
        <Svg width={width} height={height}>
          {/* Connectors first so boxes paint over the line ends. */}
          {nodes.map((node) => {
            const parent = node.entity.owned_by
              ? byName.get(node.entity.owned_by)
              : undefined;
            if (!parent) return null;

            const px = parent.x + BOX_W / 2;
            const py = parent.y + BOX_H;
            const cx = node.x + BOX_W / 2;
            const cy = node.y;
            const midY = py + GAP_Y / 2;

            return (
              <React.Fragment key={`edge-${node.entity.id}`}>
                <Path
                  d={`M ${px} ${py} V ${midY} H ${cx} V ${cy}`}
                  stroke={colors.tan}
                  strokeWidth={1.5}
                  fill="none"
                />
                {node.entity.ownership_pct > 0 ? (
                  <SvgText
                    x={cx + 6}
                    y={midY - 5}
                    fontSize={10}
                    fontFamily={fonts.semibold}
                    fill={colors.subtle}
                  >
                    {`${node.entity.ownership_pct}%`}
                  </SvgText>
                ) : null}
              </React.Fragment>
            );
          })}

          {nodes.map(({ entity, x, y }) => {
            const tone = entityRoleColors[entity.role] ?? entityRoleColors.trading;
            const onDark = entity.role === 'holding';
            return (
              <React.Fragment key={`node-${entity.id}`}>
                <Rect
                  x={x}
                  y={y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={radius.cardSm}
                  fill={tone.fill}
                  stroke={tone.stroke}
                  strokeWidth={1.5}
                />
                <SvgText
                  x={x + 13}
                  y={y + 25}
                  fontSize={13}
                  fontFamily={fonts.bold}
                  fill={onDark ? colors.white : colors.ink}
                >
                  {clip(entity.name, 17)}
                </SvgText>
                <SvgText
                  x={x + 13}
                  y={y + 41}
                  fontSize={10.5}
                  fontFamily={fonts.regular}
                  fill={onDark ? colors.tan : colors.subtle}
                >
                  {clip(entity.entity_type, 22)}
                </SvgText>
                <SvgText
                  x={x + 13}
                  y={y + 55}
                  fontSize={10}
                  fontFamily={fonts.semibold}
                  fill={onDark ? colors.tan : colors.taupe}
                >
                  {`${entity.jurisdiction} · ${entity.role}`}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingVertical: 4,
  },
});
