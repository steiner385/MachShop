# User Training Guide - Time Entry Management System

**GitHub Issue #51 - New Features Training Materials**

## 👥 Who Should Read This Guide

- **Operators**: Learn how to self-correct time entries
- **Supervisors**: Learn the approval workflow and management tools
- **Team Leads**: Understand system capabilities and delegation options

## 🎯 Learning Objectives

After completing this training, you will be able to:
- Submit accurate time entry corrections
- Understand when corrections are auto-approved vs require approval
- Use the supervisor approval dashboard effectively
- Configure auto-stop alerts and delegation settings

---

## 📚 PART 1: OPERATOR TRAINING

### Overview: What's New for Operators

You can now **correct your own time entries** without calling HR or waiting for manual fixes. The system will either auto-approve safe changes or route them to your supervisor for quick review.

### When to Use Time Entry Corrections

✅ **Good Reasons to Submit Corrections:**
- Forgot to clock out at lunch
- Clocked in/out at wrong time due to system issues
- Worked different hours than originally recorded
- Need to change work order or operation codes
- Indirect time was recorded incorrectly

❌ **Don't Submit Corrections For:**
- Time you didn't actually work
- Fraudulent time adjustments
- Changes to someone else's time entries

### Step-by-Step: Submitting a Correction

#### Step 1: Access Your Time Entries
1. Log into the MachShop system
2. Navigate to **Time Tracking** → **My Time Entries**
3. Find the entry that needs correction
4. Click **"Request Correction"**

#### Step 2: Fill Out the Correction Form

**Edit Type** (Choose one):
- **Correction**: Fix an incorrect time/date
- **Addition**: Add missing time entry
- **Deletion**: Remove incorrect entry
- **Split**: Break one entry into multiple
- **Merge**: Combine multiple entries

**Reason** (Very Important!):
- Be specific and clear
- Example: "Forgot to clock out for lunch, actual end time was 5:30 PM"
- Example: "System error during clock-in, should be 7:00 AM not 7:15 AM"
- Minimum 10 characters required

**Changes**:
- Only modify the fields that need correction
- **Start Time**: When you actually started work
- **End Time**: When you actually stopped work
- **Work Order**: Correct work order number
- **Operation**: Correct operation code
- **Break Times**: Actual break periods

#### Step 3: Review Your Changes
- Check the **"Before/After"** comparison
- Verify all changes are accurate
- Review the **risk assessment** (Low/Medium/High)

#### Step 4: Submit
- Click **"Submit Correction"**
- You'll see a confirmation message
- Check your notifications for approval status

### Understanding Auto-Approval

Your correction will be **automatically approved** if:
- ✅ Time change is less than 30 minutes
- ✅ Edit is within the same work shift
- ✅ No overlapping time entries
- ✅ Clear, detailed reason provided
- ✅ You have a good correction history

Your correction will **require supervisor approval** if:
- ⚠️ Large time adjustments (over 30 minutes)
- ⚠️ Changes cross midnight
- ⚠️ Multiple edits in one day
- ⚠️ Affects overtime calculations
- ⚠️ Creates time conflicts

### Tracking Your Corrections

#### Check Correction Status
1. Go to **Time Tracking** → **Correction History**
2. Status indicators:
   - 🟢 **Auto-Approved**: Applied immediately
   - 🟡 **Pending**: Waiting for supervisor review
   - 🔴 **Rejected**: Not approved, reason provided
   - 🔵 **More Info Needed**: Supervisor needs clarification

#### If Your Correction is Rejected
1. Read the supervisor's comments carefully
2. Submit a new correction with additional details
3. Contact your supervisor if you have questions

### Auto-Stop Alerts

You may receive **auto-stop alerts** when:
- You've been clocked in for over 12 hours
- You're clocked in during non-work hours
- System detects a potential forgotten clock-out

**When you get an auto-stop alert:**
1. **Check your current status** - Are you still working?
2. **Clock out if needed** - Don't ignore if you forgot
3. **Submit a correction** - If the time is wrong
4. **Contact supervisor** - If you need to continue working

---

## 👔 PART 2: SUPERVISOR TRAINING

### Overview: What's New for Supervisors

You now have a **centralized approval dashboard** that shows all pending time entry corrections from your team. The system prioritizes high-risk changes and provides tools for efficient bulk processing.

### Accessing the Approval Dashboard

1. Log into MachShop
2. Navigate to **Supervision** → **Time Entry Approvals**
3. Dashboard shows:
   - **Pending approvals** (sorted by risk)
   - **Team metrics** and trends
   - **Quick action buttons** for bulk operations

### Understanding the Approval Queue

#### Risk-Based Prioritization
- **🔴 High Risk (75-100)**: Review immediately
  - Large time adjustments
  - Cross-day changes
  - Multiple recent edits from same operator

- **🟡 Medium Risk (50-74)**: Review within 2 hours
  - Moderate time changes
  - Affects overtime calculations
  - First-time corrections from operator

- **🟢 Low Risk (25-49)**: Review within 8 hours
  - Small adjustments
  - Good operator history
  - Clear justification

#### Approval Queue Columns
- **Operator**: Who submitted the correction
- **Original Time**: What was originally recorded
- **Requested Change**: What they want to change it to
- **Reason**: Their explanation
- **Risk Score**: System-calculated risk (0-100)
- **Submitted**: When they submitted it

### Step-by-Step: Reviewing Corrections

#### Individual Review Process

1. **Click on a correction** to open detailed view
2. **Review the changes**:
   - **Before/After comparison**: See exact changes
   - **Reason provided**: Is it clear and reasonable?
   - **Risk factors**: What triggered the risk score?
   - **Operator history**: Pattern of corrections

3. **Make your decision**:
   - **✅ Approve**: Change is justified and accurate
   - **❌ Reject**: Change is not acceptable
   - **❓ Request More Info**: Need additional details
   - **⬆️ Escalate**: Forward to manager for decision

4. **Add comments** (recommended):
   - Explain your decision
   - Provide guidance for future corrections
   - Note any patterns you've observed

#### Decision Guidelines

**Approve When:**
- Reason is clear and believable
- Time adjustment matches the explanation
- No patterns of abuse
- Change doesn't create conflicts

**Reject When:**
- Insufficient or suspicious reason
- Time adjustment seems excessive
- Creates conflicts with other entries
- Pattern of frequent corrections

**Request More Info When:**
- Reason is unclear or incomplete
- Need additional context
- Want to verify with other sources

**Escalate When:**
- Large financial impact
- Potential policy violation
- Complex situation requiring manager input
- Operator has history of issues

### Bulk Operations

#### When to Use Bulk Approval
- Multiple **low-risk corrections** from reliable operators
- **Similar types** of corrections (e.g., all lunch clock-outs)
- **Time-sensitive** situations near payroll deadlines

#### How to Use Bulk Approval
1. **Filter the queue**: Use filters to show similar corrections
2. **Select corrections**: Check boxes for items to approve
3. **Click "Bulk Approve"**: Process all selected items
4. **Add batch comment**: Provide reason for bulk approval
5. **Monitor results**: Review success/failure notifications

⚠️ **Bulk Approval Best Practices:**
- Never bulk approve high-risk items
- Limit to 10-15 corrections at once
- Always add explanatory comments
- Review any failures individually

### Performance Metrics

#### Key Metrics to Monitor
- **Response Time**: How quickly you process approvals
- **Approval Rate**: Percentage of corrections you approve
- **Team Patterns**: Trends in your team's correction requests
- **Risk Distribution**: Mix of high/medium/low risk items

#### Accessing Your Metrics
1. Go to **Supervision** → **Team Performance**
2. View metrics for:
   - Last 7 days
   - Last 30 days
   - Custom date ranges

#### Performance Targets
- **Response Time**: <2 hours during business hours
- **Approval Rate**: 80-90% (higher may indicate too lenient, lower may indicate too strict)
- **Escalation Rate**: 5-10% of total approvals

### Delegation and Coverage

#### Setting Up Approval Delegation

**When to Use:**
- Vacation or extended absence
- High approval volume periods
- Training new supervisors

**How to Set Up:**
1. Go to **Supervision** → **Approval Settings**
2. Click **"Delegate Approval Authority"**
3. Choose:
   - **Delegate**: Who will approve in your absence
   - **Start/End Dates**: Duration of delegation
   - **Scope**: Types of corrections they can approve
   - **Limits**: Maximum risk score they can handle

#### Coverage Best Practices
- Set up delegation **before** you leave
- Brief your delegate on **team-specific patterns**
- **Monitor remotely** if possible
- **Review decisions** when you return

### Managing Problem Patterns

#### Identifying Issues
- **Frequent corrections** from same operator
- **Suspicious timing** (always near deadlines)
- **Vague reasons** or repeated explanations
- **Large adjustments** without clear cause

#### Taking Action
1. **Document patterns** in your notes
2. **Have conversation** with operator about expectations
3. **Escalate to manager** if patterns continue
4. **Consider additional training** for operator

---

## 🎯 PART 3: QUICK REFERENCE GUIDES

### Operator Quick Reference Card

**🚀 Fast Track to Corrections:**
1. Time Tracking → My Time Entries
2. Click "Request Correction"
3. Choose edit type and provide clear reason
4. Review changes and submit
5. Check notifications for status

**💡 Pro Tips:**
- Be specific in your reason (good: "Forgot to clock out for lunch at 12:30 PM")
- Small changes (<30 min) usually auto-approve
- Check your history to see patterns
- Submit corrections promptly for faster approval

### Supervisor Quick Reference Card

**🎯 Efficient Approval Process:**
1. Supervision → Time Entry Approvals
2. Start with high-risk items (red)
3. Review reason and changes
4. Approve, reject, or request more info
5. Use bulk approval for similar low-risk items

**📊 Success Metrics:**
- <2 hour response time
- 80-90% approval rate
- Clear comments on rejections
- Proactive pattern identification

---

## ❓ FREQUENTLY ASKED QUESTIONS

### For Operators

**Q: How long does approval take?**
A: Auto-approved corrections are immediate. Manual approvals typically take under 2 hours during business hours.

**Q: Can I edit a correction after submitting?**
A: No, but you can submit a new correction or contact your supervisor to discuss.

**Q: Why was my correction rejected?**
A: Check the supervisor's comments. Common reasons: insufficient detail, excessive time change, or conflicts with other entries.

**Q: Can I correct someone else's time entry?**
A: No, only your own entries. Contact HR for issues with other people's time.

### For Supervisors

**Q: What if I'm unsure about approving a correction?**
A: Use "Request More Info" to get clarification, or escalate to your manager for guidance.

**Q: Can I modify a correction instead of rejecting it?**
A: No, but you can reject with comments suggesting the correct change, then the operator can resubmit.

**Q: How do I handle corrections that affect overtime?**
A: Review carefully for accuracy and business justification. When in doubt, escalate to ensure compliance.

**Q: What if an operator submits too many corrections?**
A: Document the pattern and have a coaching conversation. Escalate if the pattern continues.

---

## 📞 Getting Help

### Training Resources
- **Video Tutorials**: Available in the Learning Management System
- **Practice Environment**: Use the training database to practice
- **Office Hours**: Weekly drop-in sessions with the training team

### Technical Support
- **System Issues**: Contact IT Help Desk
- **Process Questions**: Contact HR or your supervisor
- **Training Questions**: Contact the Learning & Development team

### Feedback
We want to improve the system based on your experience:
- **Feedback Form**: Available in the system under Help → Feedback
- **User Group Meetings**: Monthly sessions to discuss improvements
- **Direct Contact**: Email the development team with suggestions

---

**Training Complete!** 🎉

Print this guide for quick reference, and remember: the system is designed to make time entry corrections faster and more accurate for everyone.

**Next Steps:**
1. Practice in the training environment
2. Try submitting a test correction
3. Attend office hours if you have questions
4. Share feedback to help us improve

---

**Training Materials Version**: 1.0
**Last Updated**: October 31, 2025
**Questions?** Contact: training@machshop.com