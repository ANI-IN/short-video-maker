# UPI explainer: research notes (2026-11-25)

- **Scale:** in October 2026 UPI recorded 25.47 billion transactions (about 2,547 crore; "dhai hazaar crore se zyada") worth ₹31.53 lakh crore. Average daily volume was about 822 million (about 82 crore).
  - Sources: https://inc42.com/buzz/upi-transactions-rise-5-8-mom-to-record-25-47-bn-in-october/ , https://india.entrepreneur.com/business-news/upi-hits-record-25-47-bn-transactions-in-october-daily-value-crosses-inr-1-l-cr , https://www.freepressjournal.in/business/upi-transactions-hit-2547-billion-in-october-value-soars-to-3153-lakh-crore
- **Launch:** pilot on 11 April 2016 (RBI Governor Raghuram Rajan, 21 banks); public launch on 25 August 2016.
  - Sources: https://www.npci.org.in/PDF/npci/press-releases/2016/UPI_Launch_Press_Release_April_11_2016.pdf , https://www.business-standard.com/article/pti-stories/npci-s-unified-payments-interface-goes-live-116082500385_1.html
- **Flow:**
  1. The payer's UPI app (a TPAP such as PhonePe or GPay, working through its partner PSP bank) sends the request.
  2. The NPCI UPI switch resolves the payee's VPA. The handle after "@" (ybl, oksbi, axl…) identifies the PSP/partner bank that manages that UPI ID.
  3. The payer's (issuer) bank verifies the PIN and debits the account.
  4. The payee's bank credits the payee.
  5. Confirmations flow back to both sides.
  - Sources: https://m2pfintech.com/blog/npci-mapper-switch-and-psp-decoding-the-upi-transaction-journey/ , https://razorpay.com/blog/what-is-upi-and-how-it-works/ , https://bytebytego.com/guides/unified-payments-interface-upi-in-india/
- **Failed transactions** (RBI circular DPSS.CO.PD No.629/02.01.014/2019-20, 20 Sep 2019):
  - Person-to-person (account debited, beneficiary not credited): auto-reversal by T+1 (for UPI, T+1 means the next day, 4 PM). Beyond that, ₹100 per day compensation to the customer.
  - Merchant payments: T+5. The script therefore uses a payment to a friend ("dost ko bheje").
  - Sources: https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11693 , https://www.npci.org.in/PDF/npci/imps/circular/2019/IMPS-UPI-I-OC-93-I-FY-19-20-I-Harmonisation-of-Turn-Around-Time(TAT)-and-customer-compensation-for-failed-transaction.pdf
- **"Kuch hi second mein"** is a qualitative claim; no fixed latency figure is quoted.
- **CTA answer** (for pinned comment): the handle after "@" identifies which PSP / partner bank issued and manages that UPI ID (for example @ybl = PhonePe via Yes Bank, @oksbi = Google Pay via SBI).
