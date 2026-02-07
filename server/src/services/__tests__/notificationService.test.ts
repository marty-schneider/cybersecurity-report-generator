import { vi } from 'vitest'
import { notificationService } from '../notificationService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

describe('notificationService.create', () => {
  it('calls prisma.notification.create with correct data', () => {
    notificationService.create({
      userId: 'user-1',
      type: 'REPORT_COMPLETED' as any,
      title: 'Report Ready',
      message: 'Your report has been generated',
      entityType: 'Report',
      entityId: 'r1',
      projectId: 'p1',
    })

    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'REPORT_COMPLETED',
        title: 'Report Ready',
        message: 'Your report has been generated',
      }),
    })
  })
})

describe('notificationService.createBulk', () => {
  it('calls prisma.notification.createMany with one record per userId', () => {
    notificationService.createBulk(
      ['user-1', 'user-2', 'user-3'],
      {
        type: 'FINDING_STATUS_CHANGED' as any,
        title: 'Status Changed',
        message: 'Finding status updated',
      }
    )

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 'user-1' }),
        expect.objectContaining({ userId: 'user-2' }),
        expect.objectContaining({ userId: 'user-3' }),
      ]),
    })
    expect(mockPrisma.notification.createMany.mock.calls[0][0].data).toHaveLength(3)
  })
})

describe('notificationService.notifyProjectMembers', () => {
  it('fetches project with members', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce({
      id: 'p1',
      createdBy: 'owner-1',
      members: [{ userId: 'member-1' }, { userId: 'member-2' }],
    })

    await notificationService.notifyProjectMembers('p1', 'owner-1', {
      type: 'REPORT_COMPLETED' as any,
      title: 'Report Ready',
      message: 'Generated',
    })

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      include: { members: { select: { userId: true } } },
    })
  })

  it('excludes the excludeUserId from recipients', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce({
      id: 'p1',
      createdBy: 'owner-1',
      members: [{ userId: 'member-1' }, { userId: 'member-2' }],
    })

    await notificationService.notifyProjectMembers('p1', 'owner-1', {
      type: 'REPORT_COMPLETED' as any,
      title: 'Report Ready',
      message: 'Generated',
    })

    const createManyCall = mockPrisma.notification.createMany.mock.calls[0][0]
    const userIds = createManyCall.data.map((d: any) => d.userId)
    expect(userIds).not.toContain('owner-1')
    expect(userIds).toContain('member-1')
    expect(userIds).toContain('member-2')
  })

  it('deduplicates userIds (creator also a member)', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce({
      id: 'p1',
      createdBy: 'user-1',
      members: [{ userId: 'user-1' }, { userId: 'user-2' }],
    })

    await notificationService.notifyProjectMembers('p1', 'some-other-user', {
      type: 'REPORT_COMPLETED' as any,
      title: 'Report Ready',
      message: 'Generated',
    })

    const createManyCall = mockPrisma.notification.createMany.mock.calls[0][0]
    const userIds = createManyCall.data.map((d: any) => d.userId)
    // user-1 appears as both creator and member, should be deduplicated
    expect(userIds.filter((id: string) => id === 'user-1')).toHaveLength(1)
  })

  it('does nothing when project not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(null)

    await notificationService.notifyProjectMembers('nonexistent', 'user-1', {
      type: 'REPORT_COMPLETED' as any,
      title: 'Test',
      message: 'Test',
    })

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })

  it('does nothing when all members are excluded', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce({
      id: 'p1',
      createdBy: 'sole-user',
      members: [],
    })

    await notificationService.notifyProjectMembers('p1', 'sole-user', {
      type: 'REPORT_COMPLETED' as any,
      title: 'Test',
      message: 'Test',
    })

    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })
})
