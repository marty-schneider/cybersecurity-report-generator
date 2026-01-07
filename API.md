# API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "token": "jwt-token-here"
}
```

### Login
Authenticate and receive JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "token": "jwt-token-here"
}
```

### Get Current User
Get authenticated user's profile.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2024-01-07T10:00:00Z",
  "updatedAt": "2024-01-07T10:00:00Z"
}
```

---

## Project Endpoints

### List Projects
Get all projects accessible to the user.

**Endpoint:** `GET /projects`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "ACME Corp Pentest",
    "clientName": "ACME Corporation",
    "assessmentType": "PENTEST",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-15T00:00:00Z",
    "status": "ACTIVE",
    "createdBy": "user-uuid",
    "creator": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "_count": {
      "findings": 12,
      "iocs": 45,
      "ttpMappings": 8
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-07T10:00:00Z"
  }
]
```

### Create Project
Create a new project.

**Endpoint:** `POST /projects`

**Request Body:**
```json
{
  "name": "ACME Corp Pentest",
  "clientName": "ACME Corporation",
  "assessmentType": "PENTEST",
  "startDate": "2024-01-01",
  "endDate": "2024-01-15"
}
```

**Response:** `201 Created`

### Get Project
Get project details.

**Endpoint:** `GET /projects/:id`

**Response:** `200 OK` (includes findings, IOCs, TTPs, and counts)

### Update Project
Update project details.

**Endpoint:** `PUT /projects/:id`

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "status": "COMPLETED"
}
```

**Response:** `200 OK`

### Delete Project
Delete a project (requires Owner role).

**Endpoint:** `DELETE /projects/:id`

**Response:** `200 OK`

---

## Finding Endpoints

### List Findings
Get all findings for a project.

**Endpoint:** `GET /findings?projectId=<project-id>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "projectId": "project-uuid",
    "title": "SQL Injection in Login Form",
    "description": "The login form is vulnerable to SQL injection...",
    "severity": "CRITICAL",
    "cvssScore": 9.8,
    "affectedSystems": ["web-server-01", "database-prod"],
    "evidence": "Screenshot and request/response captured",
    "remediation": "Use parameterized queries...",
    "status": "NEW",
    "assignedTo": null,
    "createdAt": "2024-01-05T14:30:00Z",
    "updatedAt": "2024-01-05T14:30:00Z"
  }
]
```

### Create Finding
Add a new finding to a project.

**Endpoint:** `POST /findings`

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "title": "SQL Injection in Login Form",
  "description": "Detailed description...",
  "severity": "CRITICAL",
  "cvssScore": 9.8,
  "affectedSystems": ["web-server-01", "database-prod"],
  "evidence": "Screenshot attached",
  "remediation": "Use parameterized queries",
  "assignedTo": "user-uuid"
}
```

**Response:** `201 Created`

### Update Finding
Update a finding.

**Endpoint:** `PUT /findings/:id`

**Request Body:**
```json
{
  "status": "MITIGATED",
  "remediation": "Updated remediation steps..."
}
```

**Response:** `200 OK`

### Delete Finding
Delete a finding.

**Endpoint:** `DELETE /findings/:id`

**Response:** `200 OK`

---

## IOC Endpoints

### List IOCs
Get all IOCs for a project.

**Endpoint:** `GET /iocs?projectId=<project-id>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "projectId": "project-uuid",
    "type": "IP_ADDRESS",
    "value": "192.168.1.100",
    "timestamp": "2024-01-05T10:30:00Z",
    "context": "Suspicious outbound connection",
    "source": "Firewall logs",
    "enrichmentData": null,
    "createdAt": "2024-01-05T14:00:00Z",
    "updatedAt": "2024-01-05T14:00:00Z"
  }
]
```

### Create IOC
Add a single IOC.

**Endpoint:** `POST /iocs`

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "type": "IP_ADDRESS",
  "value": "192.168.1.100",
  "timestamp": "2024-01-05T10:30:00Z",
  "context": "Suspicious outbound connection to known C2 server",
  "source": "Firewall logs"
}
```

**IOC Types:**
- `IP_ADDRESS`
- `DOMAIN`
- `URL`
- `FILE_HASH_MD5`
- `FILE_HASH_SHA1`
- `FILE_HASH_SHA256`
- `EMAIL`
- `CVE`
- `REGISTRY_KEY`
- `MUTEX`
- `USER_AGENT`
- `CERTIFICATE`
- `FILE_PATH`
- `COMMAND_LINE`

**Response:** `201 Created`

### Bulk Create IOCs
Import multiple IOCs at once.

**Endpoint:** `POST /iocs/bulk`

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "iocs": [
    {
      "type": "IP_ADDRESS",
      "value": "192.168.1.100",
      "timestamp": "2024-01-05T10:30:00Z",
      "context": "Suspicious connection",
      "source": "Firewall"
    },
    {
      "type": "DOMAIN",
      "value": "malicious-site.com",
      "timestamp": "2024-01-05T11:00:00Z",
      "context": "Phishing campaign",
      "source": "Email gateway"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Successfully created 2 IOCs",
  "count": 2
}
```

### Update IOC
Update an IOC.

**Endpoint:** `PUT /iocs/:id`

**Response:** `200 OK`

### Delete IOC
Delete an IOC.

**Endpoint:** `DELETE /iocs/:id`

**Response:** `200 OK`

---

## TTP Endpoints (AI Analysis)

### List TTPs
Get all TTP mappings for a project.

**Endpoint:** `GET /ttps?projectId=<project-id>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "projectId": "project-uuid",
    "iocIds": ["ioc-uuid-1", "ioc-uuid-2"],
    "mitreId": "T1566.001",
    "tacticName": "Initial Access",
    "techniqueName": "Phishing: Spearphishing Attachment",
    "description": "Attacker used spearphishing emails with malicious attachments",
    "confidence": 0.92,
    "aiAnalysis": "The presence of suspicious email attachments combined with...",
    "createdAt": "2024-01-05T15:00:00Z",
    "updatedAt": "2024-01-05T15:00:00Z"
  }
]
```

### Analyze IOCs with AI ⭐
**This is the star feature!** Trigger AI analysis of all IOCs in a project.

**Endpoint:** `POST /ttps/analyze`

**Request Body:**
```json
{
  "projectId": "project-uuid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "analysis": {
    "narrative": "Based on the indicators of compromise, this appears to be a targeted phishing campaign...",
    "timeline": "2024-01-05 10:30 - Initial compromise via phishing email\n2024-01-05 11:15 - Malware execution and C2 callback...",
    "threatActorProfile": "The techniques and infrastructure suggest an APT group...",
    "recommendations": [
      "Implement email filtering for suspicious attachments",
      "Deploy EDR on all endpoints",
      "Conduct security awareness training"
    ]
  },
  "ttpMappings": [
    {
      "id": "uuid",
      "mitreId": "T1566.001",
      "tacticName": "Initial Access",
      "techniqueName": "Phishing: Spearphishing Attachment",
      "confidence": 0.92,
      "aiAnalysis": "The IOCs indicate..."
    }
  ],
  "stats": {
    "iocsAnalyzed": 15,
    "ttpsIdentified": 8,
    "tactics": ["Initial Access", "Execution", "Command and Control"]
  }
}
```

**Note:** This endpoint can take 10-30 seconds depending on the number of IOCs.

### Get TTP Matrix
Get all MITRE ATT&CK techniques organized by tactic.

**Endpoint:** `GET /ttps/matrix`

**Response:** `200 OK`
```json
{
  "Initial Access": [
    {
      "id": "T1566.001",
      "name": "Phishing: Spearphishing Attachment",
      "description": "Adversaries may send spearphishing emails...",
      "tactics": ["Initial Access"],
      "url": "https://attack.mitre.org/techniques/T1566/001/",
      "detection": "Network intrusion detection...",
      "mitigation": "User training and anti-virus..."
    }
  ],
  "Execution": [...],
  ...
}
```

### Get Technique Details
Get details about a specific MITRE ATT&CK technique.

**Endpoint:** `GET /ttps/technique/:techniqueId`

**Example:** `GET /ttps/technique/T1566.001`

**Response:** `200 OK`
```json
{
  "id": "T1566.001",
  "name": "Phishing: Spearphishing Attachment",
  "description": "Adversaries may send spearphishing emails with a malicious attachment...",
  "tactics": ["Initial Access"],
  "url": "https://attack.mitre.org/techniques/T1566/001/",
  "detection": "Network intrusion detection systems and email gateways...",
  "mitigation": "User training and anti-virus/anti-malware solutions..."
}
```

### Delete TTP Mapping
Remove a TTP mapping.

**Endpoint:** `DELETE /ttps/:id`

**Response:** `200 OK`

---

## Error Responses

All endpoints may return these error codes:

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "No token provided" | "Invalid token"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Not authorized"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## Rate Limiting

**Note:** Rate limiting is not currently implemented but recommended for production, especially for the AI analysis endpoint which can be expensive.

Recommended limits:
- Authentication endpoints: 10 requests/minute
- Regular CRUD: 100 requests/minute
- AI analysis: 5 requests/hour per project

---

## Example Usage with curl

### Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Save the token from response
TOKEN="your-jwt-token-here"
```

### Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Pentest",
    "clientName": "ACME Corp",
    "assessmentType": "PENTEST",
    "startDate": "2024-01-01"
  }'

# Save project ID from response
PROJECT_ID="your-project-uuid"
```

### Add IOCs
```bash
curl -X POST http://localhost:5000/api/iocs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'",
    "type": "IP_ADDRESS",
    "value": "192.168.1.100",
    "timestamp": "2024-01-05T10:30:00Z",
    "context": "Suspicious outbound connection"
  }'
```

### Trigger AI Analysis
```bash
curl -X POST http://localhost:5000/api/ttps/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'$PROJECT_ID'"
  }'
```

---

## Websockets (Future)

Currently not implemented, but recommended for:
- Real-time AI analysis progress updates
- Team collaboration notifications
- Live finding updates

---

**API Version:** v1
**Last Updated:** January 2024
