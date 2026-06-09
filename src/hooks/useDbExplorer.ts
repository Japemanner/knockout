import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTableRecords,
  getForeignKeyOptions,
  createRecord,
  updateRecord,
  deleteRecord,
} from '@/actions/external-db'
import {
  getLocalTableRecords,
  getLocalForeignKeyOptions,
  createLocalRecord,
  updateLocalRecord,
  deleteLocalRecord,
} from '@/actions/local-db'

export function useTableRecords(
  connectionId: string,
  tableName: string,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ['table-records', connectionId, tableName, page, pageSize],
    queryFn: () => getTableRecords({ connectionId, tableName, page, pageSize }),
    staleTime: 15_000,
  })
}

export function useLocalTableRecords(
  tableName: string,
  page: number,
  pageSize: number,
) {
  return useQuery({
    queryKey: ['local-table-records', tableName, page, pageSize],
    queryFn: () => getLocalTableRecords({ tableName, page, pageSize }),
    staleTime: 15_000,
  })
}

export function useCreateRecord(connectionId: string, tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      createRecord({ connectionId, tableName, values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-records', connectionId, tableName] })
    },
  })
}

export function useUpdateRecord(connectionId: string, tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { primaryKey: { column: string; value: unknown }; values: Record<string, unknown> }) =>
      updateRecord({ connectionId, tableName, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-records', connectionId, tableName] })
    },
  })
}

export function useDeleteRecord(connectionId: string, tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (primaryKey: { column: string; value: unknown }) =>
      deleteRecord({ connectionId, tableName, primaryKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-records', connectionId, tableName] })
    },
  })
}

export function useForeignKeyOptions(connectionId: string, referencedTable: string, referencedColumn: string) {
  return useQuery({
    queryKey: ['fk-options', connectionId, referencedTable, referencedColumn],
    queryFn: () => getForeignKeyOptions({ connectionId, referencedTable, referencedColumn }),
    staleTime: 60_000,
  })
}

export function useLocalForeignKeyOptions(referencedTable: string, referencedColumn: string) {
  return useQuery({
    queryKey: ['local-fk-options', referencedTable, referencedColumn],
    queryFn: () => getLocalForeignKeyOptions({ referencedTable, referencedColumn }),
    staleTime: 60_000,
  })
}

export function useCreateLocalRecord(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      createLocalRecord({ tableName, values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-table-records', tableName] })
    },
  })
}

export function useUpdateLocalRecord(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { primaryKey: { column: string; value: unknown }; values: Record<string, unknown> }) =>
      updateLocalRecord({ tableName, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-table-records', tableName] })
    },
  })
}

export function useDeleteLocalRecord(tableName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (primaryKey: { column: string; value: unknown }) =>
      deleteLocalRecord({ tableName, primaryKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-table-records', tableName] })
    },
  })
}