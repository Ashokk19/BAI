/**
 * Vendor Credits API Service (Purchases)
 * PostgreSQL-backed endpoints under /api/purchases/credits
 */

import { apiService } from "./api"

export interface VendorCreditListItem {
  id: number
  credit_note_number: string
  vendor_id: number
  vendor_name?: string | null
  vendor_code?: string | null
  bill_id?: number | null
  credit_date: string
  reason?: string | null
  status: string
  credit_amount: number
  used_amount: number
  balance_amount: number
  notes?: string | null
  created_at: string
  updated_at?: string | null
}

export interface VendorCreditDetail extends VendorCreditListItem {}

export interface VendorCreditsListResponse {
  credits: VendorCreditListItem[]
  total: number
  skip: number
  limit: number
}

export interface VendorCreditCreatePayload {
  vendor_id: number
  bill_id?: number
  credit_date: string
  reason?: string
  credit_amount: number
  notes?: string
}

export interface VendorCreditUpdatePayload {
  vendor_id?: number
  bill_id?: number
  credit_date?: string
  reason?: string
  status?: string
  credit_amount?: number
  notes?: string
}

export interface VendorCreditCreateResponse {
  message: string
  credit_note_number: string
  credit_id: number
}

export interface VendorCreditUpdateResponse {
  message: string
  credit_id: number
}

/**
 * Get all vendor credits with pagination and filters
 */
export const getVendorCredits = async (
  params: {
    skip?: number
    limit?: number
    vendor_id?: number
    status?: string
  } = {},
): Promise<VendorCreditsListResponse> => {
  const searchParams = new URLSearchParams()

  if (params.skip !== undefined) searchParams.append("skip", params.skip.toString())
  if (params.limit !== undefined) searchParams.append("limit", params.limit.toString())
  if (params.vendor_id) searchParams.append("vendor_id", params.vendor_id.toString())
  if (params.status) searchParams.append("status_filter", params.status)

  const qs = searchParams.toString()
  return await apiService.get<VendorCreditsListResponse>(`/api/purchases/credits/${qs ? `?${qs}` : ""}`)
}

/**
 * Get a specific vendor credit by ID
 */
export const getVendorCredit = async (creditId: number): Promise<VendorCreditDetail> => {
  return await apiService.get<VendorCreditDetail>(`/api/purchases/credits/${creditId}`)
}

/**
 * Create a new vendor credit
 */
export const createVendorCredit = async (creditData: VendorCreditCreatePayload): Promise<VendorCreditCreateResponse> => {
  return await apiService.post<VendorCreditCreateResponse, VendorCreditCreatePayload>("/api/purchases/credits/", creditData)
}

/**
 * Update an existing vendor credit
 */
export const updateVendorCredit = async (
  creditId: number,
  creditData: VendorCreditUpdatePayload,
): Promise<VendorCreditUpdateResponse> => {
  return await apiService.put<VendorCreditUpdateResponse, VendorCreditUpdatePayload>(
    `/api/purchases/credits/${creditId}`,
    creditData,
  )
}

/**
 * Delete a vendor credit
 */
export const deleteVendorCredit = async (creditId: number): Promise<void> => {
  try {
    await apiService.delete<void>(`/api/purchases/credits/${creditId}`)
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || "Failed to delete vendor credit"
    throw new Error(errorMessage)
  }
}

export type VendorCreditCreate = VendorCreditCreatePayload