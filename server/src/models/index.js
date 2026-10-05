const sequelize = require('../config/database');
const Admin = require('./Admin');
const CampCenter = require('./CampCenter');
const Reservation = require('./Reservation');
const ReservationMeal = require('./ReservationMeal');
const ParticipantFile = require('./ParticipantFile');
const Participant = require('./Participant');
const CommitmentDocument = require('./CommitmentDocument');
const SmsLog = require('./SmsLog');
const ReservationStatusLog = require('./ReservationStatusLog');
const ParentalConsentDocument = require('./ParentalConsentDocument');

// Associations
Reservation.belongsTo(CampCenter, { foreignKey: 'camp_center_id', as: 'campCenter' });
CampCenter.hasMany(Reservation, { foreignKey: 'camp_center_id', as: 'reservations' });

Reservation.belongsTo(Admin, { foreignKey: 'reviewed_by_admin_id', as: 'reviewedByAdmin' });
Admin.hasMany(Reservation, { foreignKey: 'reviewed_by_admin_id', as: 'reviewedReservations' });
Reservation.belongsTo(Admin, { foreignKey: 'forwarded_by_admin_id', as: 'forwardedByAdmin' });
Reservation.belongsTo(Admin, { foreignKey: 'hq_reviewed_by_admin_id', as: 'hqReviewedByAdmin' });

Admin.belongsTo(CampCenter, { foreignKey: 'camp_center_id', as: 'campCenter' });

Reservation.hasMany(ReservationMeal, { foreignKey: 'reservation_id', as: 'meals' });
ReservationMeal.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

Reservation.hasMany(ParticipantFile, { foreignKey: 'reservation_id', as: 'participantFiles' });
ParticipantFile.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

Reservation.hasMany(Participant, { foreignKey: 'reservation_id', as: 'participants' });
Participant.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
Participant.belongsTo(ParticipantFile, { foreignKey: 'participant_file_id', as: 'participantFile' });
ParticipantFile.hasMany(Participant, { foreignKey: 'participant_file_id', as: 'participants' });

Reservation.hasMany(CommitmentDocument, { foreignKey: 'reservation_id', as: 'commitmentDocuments' });
CommitmentDocument.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
CommitmentDocument.belongsTo(Admin, { foreignKey: 'reviewed_by_admin_id', as: 'reviewedByAdmin' });

Reservation.hasMany(ParentalConsentDocument, { foreignKey: 'reservation_id', as: 'consentDocuments' });
ParentalConsentDocument.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

Reservation.hasMany(SmsLog, { foreignKey: 'reservation_id', as: 'smsLogs' });
SmsLog.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });

Reservation.hasMany(ReservationStatusLog, { foreignKey: 'reservation_id', as: 'statusLogs' });
ReservationStatusLog.belongsTo(Reservation, { foreignKey: 'reservation_id', as: 'reservation' });
ReservationStatusLog.belongsTo(Admin, { foreignKey: 'changed_by_admin_id', as: 'changedByAdmin' });

module.exports = {
  sequelize,
  Admin,
  CampCenter,
  Reservation,
  ReservationMeal,
  ParticipantFile,
  Participant,
  CommitmentDocument,
  SmsLog,
  ReservationStatusLog,
  ParentalConsentDocument
};
