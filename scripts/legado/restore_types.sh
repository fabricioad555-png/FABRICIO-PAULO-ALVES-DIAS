#!/bin/bash
sed -i "s/export type AssetSelectionMode = 'ALL_ASSETS' | 'CUSTOM';/export type AssetSelectionMode = 'TOP_3_PROBABILITY' | 'ALL_ASSETS' | 'CUSTOM';/" src/types/tradingTypes.ts
sed -i "s/assetSelectionMode?: AssetSelectionMode; \/\/ Filter for which coins to trade: All 15 (default), or Custom/assetSelectionMode?: AssetSelectionMode; \/\/ Filter for which coins to trade: Top 3 Pareto (default), All 15, or Custom/" src/types/tradingTypes.ts
