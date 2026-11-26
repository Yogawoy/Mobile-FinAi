import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type AiRecommendationItem } from '@/lib/mockData';
import { Colors, FontFamily, Radius, Typography } from '@/theme/tokens';

interface AdvisorRecommendationsCardProps {
  recommendations: AiRecommendationItem[];
}

export function AdvisorRecommendationsCard({
  recommendations,
}: AdvisorRecommendationsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Rekomendasi Penghematan AI</Text>

      <View style={styles.list}>
        {recommendations.map((rec, idx) => (
          <View
            key={rec.id}
            style={[styles.row, idx > 0 && styles.rowDivider]}
          >
            <View style={styles.numberCircle}>
              <Text style={[styles.numberText, Typography.tabularNums]}>
                {idx + 1}
              </Text>
            </View>

            <View style={styles.body}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recDetail}>{rec.detail}</Text>
              <View style={styles.savingTag}>
                <Text style={[styles.savingTagText, Typography.tabularNums]}>
                  {rec.savingTag}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numberText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.primary,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  recTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  recDetail: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  savingTag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: Colors.incomeSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  savingTagText: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    color: Colors.incomeText,
  },
});
