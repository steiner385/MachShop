/**
 * Code Signing & Verification for Extensions
 * Ensures extensions are signed and unmodified
 * Issue #437: Extension Security Model & Sandboxing
 */

import { CodeSigningCertificate } from './extension-security-model';

/**
 * Code signing result
 */
export interface CodeSigningResult {
  signed: boolean;
  signature: string;
  algorithm: string;
  timestamp: Date;
}

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  certificate?: CodeSigningCertificate;
  verificationTime: Date;
  trustedSigner: boolean;
  error?: string;
}

/**
 * Code Signer - signs extension code packages
 */
export class CodeSigner {
  /**
   * Sign extension code with private key
   */
  static signCode(code: string, privateKey: string): CodeSigningResult {
    // In a real implementation, this would use cryptographic libraries
    // like crypto or node-rsa to sign the code with the private key
    // For now, we'll create a mock implementation

    const hash = this.hashCode(code);
    const timestamp = new Date();

    return {
      signed: true,
      signature: `sig_${hash}_${privateKey.substring(0, 16)}`,
      algorithm: 'SHA256withRSA',
      timestamp
    };
  }

  /**
   * Generate code hash
   */
  private static hashCode(code: string): string {
    // Simplified hash - in real implementation use crypto.createHash('sha256')
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16).substring(0, 16);
  }
}

/**
 * Code Verifier - verifies extension code signatures
 */
export class CodeVerifier {
  private trustedIssuers: Set<string> = new Set([
    'MachShop Official',
    'MachShop Trusted Partner'
  ]);

  private trustedPublishers: Set<string> = new Set();

  /**
   * Verify code signature
   */
  verifySignature(
    code: string,
    signature: string,
    certificate: CodeSigningCertificate
  ): SignatureVerificationResult {
    try {
      // Check certificate validity
      const now = new Date();
      if (now < certificate.validFrom || now > certificate.validTo) {
        return {
          valid: false,
          verificationTime: now,
          trustedSigner: false,
          error: 'Certificate expired or not yet valid'
        };
      }

      // Check issuer is trusted
      const issuerTrusted = this.trustedIssuers.has(certificate.issuer);
      if (!issuerTrusted) {
        return {
          valid: false,
          verificationTime: now,
          trustedSigner: false,
          error: 'Certificate issuer not trusted'
        };
      }

      // Verify signature (simplified)
      const expectedSignature = this.generateExpectedSignature(code);
      const signatureValid = this.compareSignatures(
        signature,
        expectedSignature
      );

      if (!signatureValid) {
        return {
          valid: false,
          certificate,
          verificationTime: now,
          trustedSigner: issuerTrusted,
          error: 'Signature verification failed'
        };
      }

      // Check if publisher is trusted
      const publisherTrusted = this.trustedPublishers.has(certificate.subject);

      return {
        valid: true,
        certificate,
        verificationTime: now,
        trustedSigner: issuerTrusted && publisherTrusted
      };
    } catch (error) {
      return {
        valid: false,
        verificationTime: new Date(),
        trustedSigner: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate expected signature from code
   */
  private generateExpectedSignature(code: string): string {
    // In real implementation, this would use the public key from the certificate
    // to verify the signature using proper cryptographic algorithms
    const hash = this.hashCode(code);
    return `sig_${hash}`;
  }

  /**
   * Hash code for signature generation
   */
  private hashCode(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16).substring(0, 16);
  }

  /**
   * Compare signatures (secure comparison)
   */
  private compareSignatures(sig1: string, sig2: string): boolean {
    // Use timing-safe comparison in real implementation
    // For now, simple comparison
    if (sig1.length !== sig2.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < sig1.length; i++) {
      result |= sig1.charCodeAt(i) ^ sig2.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Add trusted issuer
   */
  addTrustedIssuer(issuer: string): void {
    this.trustedIssuers.add(issuer);
  }

  /**
   * Add trusted publisher
   */
  addTrustedPublisher(publisher: string): void {
    this.trustedPublishers.add(publisher);
  }

  /**
   * Remove trusted issuer
   */
  removeTrustedIssuer(issuer: string): void {
    this.trustedIssuers.delete(issuer);
  }

  /**
   * Remove trusted publisher
   */
  removeTrustedPublisher(publisher: string): void {
    this.trustedPublishers.delete(publisher);
  }

  /**
   * Get trusted issuers
   */
  getTrustedIssuers(): string[] {
    return Array.from(this.trustedIssuers);
  }

  /**
   * Get trusted publishers
   */
  getTrustedPublishers(): string[] {
    return Array.from(this.trustedPublishers);
  }
}

/**
 * Certificate Authority - manages code signing certificates
 */
export class CertificateAuthority {
  /**
   * Generate a code signing certificate
   */
  static generateCertificate(
    subject: string,
    issuer: string,
    publicKey: string,
    validityDays: number = 365
  ): CodeSigningCertificate {
    const now = new Date();
    const validTo = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    return {
      thumbprint: this.generateThumbprint(subject + publicKey),
      issuer,
      subject,
      validFrom: now,
      validTo,
      publicKeyAlgorithm: 'RSA',
      algorithm: 'SHA256withRSA'
    };
  }

  /**
   * Generate certificate thumbprint
   */
  private static generateThumbprint(data: string): string {
    // Simplified thumbprint generation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16).toUpperCase().padStart(40, '0');
  }

  /**
   * Validate certificate chain
   */
  static validateCertificateChain(
    leaf: CodeSigningCertificate,
    intermediate?: CodeSigningCertificate,
    root?: CodeSigningCertificate
  ): boolean {
    const now = new Date();

    // Check leaf certificate
    if (now < leaf.validFrom || now > leaf.validTo) {
      return false;
    }

    // Check intermediate if provided
    if (intermediate) {
      if (now < intermediate.validFrom || now > intermediate.validTo) {
        return false;
      }
    }

    // Check root if provided
    if (root) {
      if (now < root.validFrom || now > root.validTo) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Extension Package Signer - signs complete extension packages
 */
export class ExtensionPackageSigner {
  private signer: CodeSigner = CodeSigner;

  /**
   * Sign extension package
   */
  signPackage(
    extensionCode: string,
    packageMetadata: Record<string, any>,
    privateKey: string
  ): {
    packageSignature: string;
    packageHash: string;
    timestamp: Date;
  } {
    const packageContent = JSON.stringify({
      code: extensionCode,
      metadata: packageMetadata
    });

    const result = CodeSigner.signCode(packageContent, privateKey);

    return {
      packageSignature: result.signature,
      packageHash: this.hashPackage(packageContent),
      timestamp: result.timestamp
    };
  }

  /**
   * Verify extension package integrity
   */
  verifyPackageIntegrity(
    packageContent: string,
    packageHash: string
  ): boolean {
    return this.hashPackage(packageContent) === packageHash;
  }

  /**
   * Hash package content
   */
  private hashPackage(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

/**
 * Security Policy: Code Signing Requirements
 */
export const CODE_SIGNING_POLICY = {
  // Tier-based code signing requirements
  tierRequirements: {
    COMMUNITY: {
      required: true,
      selfSignedAllowed: true,
      trustedPublisherRequired: false
    },
    PROFESSIONAL: {
      required: true,
      selfSignedAllowed: false,
      trustedPublisherRequired: false
    },
    ENTERPRISE: {
      required: true,
      selfSignedAllowed: false,
      trustedPublisherRequired: true
    }
  },

  // Certificate requirements
  certificateRequirements: {
    minKeyLength: 2048,
    signatureAlgorithm: 'SHA256withRSA',
    validityMinimumDays: 90,
    maxCertificateChainLength: 3
  },

  // Code modification detection
  enableIntegrityChecking: true,
  enablePackageVerification: true,

  // Supply chain security
  trustedCertificateAuthorities: [
    'MachShop CA',
    'DigiCert',
    'GlobalSign'
  ],
  requirePublisherVerification: true
};
