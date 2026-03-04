import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssuanceRepository } from './issuance.repository';
import type {
  IssueDocumentsInput,
  IssueDocumentsResult,
} from './types/issued-document.types';

@Injectable()
export class IssuanceService {
  constructor(private readonly issuanceRepository: IssuanceRepository) {}

  async getIssuedDocument(documentId: string) {
    const document =
      await this.issuanceRepository.findIssuedDocumentById(documentId);

    if (!document) {
      throw new NotFoundException('Issued document not found.');
    }

    return document;
  }

  getIssuedDocumentsForUser(userId: string) {
    return this.issuanceRepository.findIssuedDocumentsByUserId(userId);
  }

  issueDocuments(input: IssueDocumentsInput): Promise<IssueDocumentsResult> {
    return this.issuanceRepository.finalizeIssuedDocumentsFromPaymentSucceeded(
      input,
    );
  }

  async getRailIssuedDocument(documentId: string) {
    const document =
      await this.issuanceRepository.findRailIssuedDocumentById(documentId);

    if (!document) {
      throw new NotFoundException('Issued rail document not found.');
    }

    return document;
  }

  getRailIssuedDocumentsForUser(userId: string) {
    return this.issuanceRepository.findRailIssuedDocumentsByUserId(userId);
  }

  issueRailDocuments(
    input: IssueDocumentsInput,
  ): Promise<IssueDocumentsResult> {
    return this.issuanceRepository.finalizeRailIssuedDocumentsFromPaymentSucceeded(
      input,
    );
  }

  async getAirIssuedDocument(documentId: string) {
    const document =
      await this.issuanceRepository.findAirIssuedDocumentById(documentId);

    if (!document) {
      throw new NotFoundException('Issued air document not found.');
    }

    return document;
  }

  getAirIssuedDocumentsForUser(userId: string) {
    return this.issuanceRepository.findAirIssuedDocumentsByUserId(userId);
  }

  issueAirDocuments(
    input: IssueDocumentsInput,
  ): Promise<IssueDocumentsResult> {
    return this.issuanceRepository.finalizeAirIssuedDocumentsFromPaymentSucceeded(
      input,
    );
  }
}
