import type { CollectionConfig } from 'payload'
import { authenticated, publicRead, isCommissioner } from '@/access/roles'

export const Matches: CollectionConfig = {
  slug: 'matches',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['tournament', 'homeFranchise', 'awayFranchise', 'status', 'playedAt'],
    group: 'Competition',
  },
  access: {
    read: publicRead,
    create: authenticated,
    update: authenticated, // owners can enter results for their own games
    delete: ({ req: { user } }) => isCommissioner(user),
  },
  fields: [
    {
      name: 'tournament',
      type: 'relationship',
      relationTo: 'tournaments',
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'round', type: 'text', admin: { width: '50%', description: 'e.g. "Quarterfinal"' } },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'scheduled',
          options: [
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Live', value: 'live' },
            { label: 'Final', value: 'final' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'homeFranchise',
          type: 'relationship',
          relationTo: 'franchises',
          required: true,
          admin: { width: '35%' },
        },
        { name: 'homeScore', type: 'number', admin: { width: '15%' } },
        { name: 'awayScore', type: 'number', admin: { width: '15%' } },
        {
          name: 'awayFranchise',
          type: 'relationship',
          relationTo: 'franchises',
          required: true,
          admin: { width: '35%' },
        },
      ],
    },
    {
      name: 'walkover',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Match awarded by walkover (no game played).' },
    },
    {
      name: 'quarterScores',
      type: 'json',
      admin: { description: 'e.g. [[28,24],[19,30],...] home/away per quarter.' },
    },
    {
      name: 'mvp',
      type: 'relationship',
      relationTo: 'players',
      admin: { position: 'sidebar', description: 'Player of the match.' },
    },
    {
      name: 'playedAt',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
