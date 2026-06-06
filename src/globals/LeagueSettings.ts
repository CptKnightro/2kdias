import type { GlobalConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

export const LeagueSettings: GlobalConfig = {
  slug: 'league-settings',
  label: 'League Settings',
  admin: { group: 'League' },
  access: {
    read: publicRead,
    update: commissionerOnly,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'seasonName',
          type: 'text',
          defaultValue: 'Season 1',
          admin: { width: '50%' },
        },
        {
          name: 'leagueLogo',
          type: 'upload',
          relationTo: 'media',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Currency',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'currencyName',
              type: 'text',
              defaultValue: 'Dollars',
              admin: { width: '34%', description: 'e.g. "Dollars", "Credits".' },
            },
            {
              name: 'currencySymbol',
              type: 'text',
              defaultValue: '$',
              admin: { width: '33%', description: 'Prefix, e.g. "$".' },
            },
            {
              name: 'currencySuffix',
              type: 'text',
              defaultValue: 'M',
              admin: { width: '33%', description: 'Suffix, e.g. "M" for millions.' },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Defaults & windows',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'defaultPurse',
              type: 'number',
              defaultValue: 100,
              admin: { width: '50%' },
            },
            {
              name: 'squadCap',
              type: 'number',
              defaultValue: 12,
              admin: { width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'transferWindowOpen',
              type: 'date',
              admin: { width: '50%', date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'transferWindowClose',
              type: 'date',
              admin: { width: '50%', date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
      ],
    },
  ],
}
