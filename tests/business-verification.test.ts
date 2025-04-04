import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockAdmin = mockTxSender
const mockBlockHeight = 100

// Mock contract state
let businesses = {}
let admin = mockAdmin

// Mock contract functions
const businessVerification = {
  "var-get": (varName) => {
    if (varName === "admin") return admin
    throw new Error(`Unknown variable: ${varName}`)
  },
  "var-set": (varName, value) => {
    if (varName === "admin") {
      admin = value
      return true
    }
    throw new Error(`Unknown variable: ${varName}`)
  },
  "map-get?": (mapName, key) => {
    if (mapName === "businesses") {
      const businessId = key["business-id"]
      return businesses[businessId] || null
    }
    throw new Error(`Unknown map: ${mapName}`)
  },
  "map-insert": (mapName, key, value) => {
    if (mapName === "businesses") {
      const businessId = key["business-id"]
      if (businesses[businessId]) return false
      businesses[businessId] = value
      return true
    }
    throw new Error(`Unknown map: ${mapName}`)
  },
  "map-set": (mapName, key, value) => {
    if (mapName === "businesses") {
      const businessId = key["business-id"]
      businesses[businessId] = value
      return true
    }
    throw new Error(`Unknown map: ${mapName}`)
  },
  "block-height": mockBlockHeight,
  "is-eq": (a, b) => a === b,
  "tx-sender": mockTxSender,
  merge: (obj1, obj2) => ({ ...obj1, ...obj2 }),
}

// Mock contract public functions
const registerBusiness = (businessId, name, registrationNumber, industry) => {
  const caller = businessVerification["tx-sender"]
  
  const inserted = businessVerification["map-insert"](
      "businesses",
      { "business-id": businessId },
      {
        owner: caller,
        name,
        "registration-number": registrationNumber,
        industry,
        verified: false,
        "verification-date": 0,
      },
  )
  
  return inserted ? { ok: true } : { err: 1 }
}

const verifyBusiness = (businessId) => {
  const caller = businessVerification["tx-sender"]
  
  if (!businessVerification["is-eq"](caller, businessVerification["var-get"]("admin"))) {
    return { err: 3 }
  }
  
  const business = businessVerification["map-get?"]("businesses", { "business-id": businessId })
  
  if (!business) {
    return { err: 2 }
  }
  
  businessVerification["map-set"](
      "businesses",
      { "business-id": businessId },
      businessVerification["merge"](business, {
        verified: true,
        "verification-date": businessVerification["block-height"],
      }),
  )
  
  return { ok: true }
}

const isBusinessVerified = (businessId) => {
  const business = businessVerification["map-get?"]("businesses", { "business-id": businessId })
  return business ? business.verified : false
}

const getBusiness = (businessId) => {
  return businessVerification["map-get?"]("businesses", { "business-id": businessId })
}

const setAdmin = (newAdmin) => {
  const caller = businessVerification["tx-sender"]
  
  if (!businessVerification["is-eq"](caller, businessVerification["var-get"]("admin"))) {
    return { err: 4 }
  }
  
  businessVerification["var-set"]("admin", newAdmin)
  return { ok: true }
}

describe("Business Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    businesses = {}
    admin = mockAdmin
  })
  
  describe("register-business", () => {
    it("should register a new business", () => {
      const result = registerBusiness("business123", "Test Business", "REG123456", "Technology")
      
      expect(result).toEqual({ ok: true })
      
      const business = getBusiness("business123")
      expect(business).toEqual({
        owner: mockTxSender,
        name: "Test Business",
        "registration-number": "REG123456",
        industry: "Technology",
        verified: false,
        "verification-date": 0,
      })
    })
    
    it("should fail when registering a business with an existing ID", () => {
      registerBusiness("business123", "Test Business", "REG123456", "Technology")
      
      const result = registerBusiness("business123", "Another Business", "REG789012", "Finance")
      
      expect(result).toEqual({ err: 1 })
    })
  })
  
  describe("verify-business", () => {
    it("should verify a business when called by admin", () => {
      registerBusiness("business123", "Test Business", "REG123456", "Technology")
      
      const result = verifyBusiness("business123")
      
      expect(result).toEqual({ ok: true })
      
      const business = getBusiness("business123")
      expect(business.verified).toBe(true)
      expect(business["verification-date"]).toBe(mockBlockHeight)
    })
    
    it("should fail when verifying a non-existent business", () => {
      const result = verifyBusiness("nonexistent")
      
      expect(result).toEqual({ err: 2 })
    })
  })
  
  describe("is-business-verified", () => {
    it("should return true for verified businesses", () => {
      registerBusiness("business123", "Test Business", "REG123456", "Technology")
      verifyBusiness("business123")
      
      const result = isBusinessVerified("business123")
      
      expect(result).toBe(true)
    })
    
    it("should return false for unverified businesses", () => {
      registerBusiness("business123", "Test Business", "REG123456", "Technology")
      
      const result = isBusinessVerified("business123")
      
      expect(result).toBe(false)
    })
    
    it("should return false for non-existent businesses", () => {
      const result = isBusinessVerified("nonexistent")
      
      expect(result).toBe(false)
    })
  })
  
  describe("set-admin", () => {
    it("should set a new admin when called by the current admin", () => {
      const newAdmin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      const result = setAdmin(newAdmin)
      
      expect(result).toEqual({ ok: true })
      expect(businessVerification["var-get"]("admin")).toBe(newAdmin)
    })
  })
})

