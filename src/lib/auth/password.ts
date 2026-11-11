import "server-only"
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto"
import { Effect } from "effect"

// scrypt parameters (OWASP-recommended baseline: N=2^15, r=8, p=1).
const N = 32768
const R = 8
const P = 1
const KEYLEN = 64
const MAXMEM = 64 * 1024 * 1024

const scryptAsync = (password: string, salt: Buffer, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, options, (err, key) => (err ? reject(err) : resolve(key))),
  )

/** Hash format: `scrypt$N$r$p$<salt b64url>$<hash b64url>` */
export const hashPassword = (password: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const salt = randomBytes(16)
    const key = await scryptAsync(password, salt, { N, r: R, p: P, maxmem: MAXMEM })
    return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$")
  })

export const verifyPassword = (password: string, stored: string): Effect.Effect<boolean> =>
  Effect.promise(async () => {
    const [algo, n, r, p, saltB64, hashB64] = stored.split("$")
    if (algo !== "scrypt" || !saltB64 || !hashB64) return false
    const expected = Buffer.from(hashB64, "base64url")
    const key = await scryptAsync(password, Buffer.from(saltB64, "base64url"), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAXMEM,
    })
    return key.length === expected.length && timingSafeEqual(key, expected)
  })

/** Used when the account doesn't exist so sign-in timing doesn't reveal it. */
const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(KEYLEN).toString("base64url")}`
export const burnPasswordCheck = (password: string) => verifyPassword(password, DUMMY_HASH).pipe(Effect.asVoid)
