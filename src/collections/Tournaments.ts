import type { CollectionConfig } from 'payload'
import { commissionerOnly, publicRead } from '@/access/roles'

export const Tournaments: CollectionConfig = {
  slug: 'tournaments',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'format', 'status', 'champion'],
    group: 'Competition',
  },
  access: {
    read: publicRead,
    create: commissionerOnly,
    update: commissionerOnly,
    delete: commissionerOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'format',
          type: 'select',
          defaultValue: 'round-robin',
          options: [
            { label: 'Round Robin', value: 'round-robin' },
            { label: 'Single Elimination', value: 'single-elim' },
            { label: 'Double Elimination', value: 'double-elim' },
            { label: 'Groups + Knockout', value: 'groups-knockout' },
            { label: 'Season League', value: 'season-league' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'status',
          type: 'select',
          defaultValue: 'upcoming',
          options: [
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Completed', value: 'completed' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'season', type: 'text', admin: { description: 'e.g. "Season 1"' } },
    {
      name: 'participants',
      type: 'relationship',
      relationTo: 'franchises',
      hasMany: true,
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'champion',
      type: 'relationship',
      relationTo: 'franchises',
      admin: { position: 'sidebar' },
    },
    {
      name: 'bracket',
      type: 'json',
      admin: {
        position: 'sidebar',
        description: 'Auto-generated bracket/fixture structure.',
      },
    },
  ],
}
