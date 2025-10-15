# 🧭 Git Branching Guide  
### For: Hotel HRIS System (System Integration Project)  

---

## 🌿 Overview
We use **Git branching** to organize our group’s work and avoid conflicts while developing different modules (Employee, Attendance, Payroll, etc.).  

This setup helps everyone:
- Work on their own features safely.  
- Merge updates in a controlled way.  
- Keep `main` stable for final outputs or demos.  

---

## 🏷️ Branch Structure

| Branch | Description | Who Works Here | Notes |
|---------|--------------|----------------|-------|
| **main** | Final, stable version of the system. Used for deployment or submission. | Project lead only | ✅ Protected – no direct commits |
| **develop** | Integration branch for all new features. Every module merges here first. | Everyone | ⚠️ No direct work; only merge requests |
| **feature/*** | For new features, pages, or modules. | Each member | Work here until feature is complete |
| **bugfix/*** | For fixing issues found during testing on `develop`. | Assigned dev | Merge back to `develop` |
| **hotfix/*** | For emergency fixes on `main` (after final merge). | Project lead | Merge to both `main` and `develop` |
| **release/*** | For milestone versions (optional). | Team | Use before final merge |

---

## 🤩 Naming Conventions

Follow consistent naming to avoid confusion:

| Type | Format | Example |
|------|---------|----------|
| Feature | `feature/<module-name>` | `feature/employee-management` |
| Bugfix | `bugfix/<short-desc>` | `bugfix/attendance-timeout` |
| Hotfix | `hotfix/<short-desc>` | `hotfix/payroll-rounding` |
| Release | `release/<version>` | `release/v1.0` |

---

## 🧠 Basic Workflow (For Each Developer)

### 1️⃣ Checkout to Develop
Always start from the latest version of `develop`:
```bash
git checkout develop
git pull origin develop
```

### 2️⃣ Create Your Feature Branch
Make your own branch from `develop`:
```bash
git checkout -b feature/<module-name>
```
Example:
```bash
git checkout -b feature/payroll-api
```

### 3️⃣ Work Normally
Edit code, commit regularly:
```bash
git add .
git commit -m "Added payroll calculation endpoint"
```

Push it online:
```bash
git push origin feature/payroll-api
```

### 4️⃣ Create a Pull Request (PR)
Once finished, go to **GitHub → Pull Requests**, and make one:
```
feature/payroll-api → develop
```
Ask another teammate to review or approve before merging.

### 5️⃣ Update and Continue
Before creating a new branch, always pull from `develop` again:
```bash
git checkout develop
git pull origin develop
```

---

## 🔁 Merge Flow Summary

```
feature/*  →  develop  →  main
bugfix/*   →  develop
hotfix/*   →  main (+ develop)
release/*  →  main
```

---

## 🧑‍💻 Example Scenario

Let’s say:
- **Matt** is working on the **Employee Management module**  
- **Kyle** is working on **Attendance tracking**  

Here’s how it goes:
```
Matt:
  git checkout develop
  git checkout -b feature/employee-module
  (code, commit, push)
  → PR → develop

Kyle:
  git checkout develop
  git checkout -b feature/attendance-system
  (code, commit, push)
  → PR → develop
```

Once both PRs are merged into `develop`, the team tests everything together.  
When everything works → merge `develop` into `main`.

---

## ⚙️ Best Practices

- ✅ **Pull before you start** – always run `git pull origin develop`
- ✅ **Commit often** – but keep messages short and descriptive  
  Example: `feat(attendance): added overtime calculation`
- ✅ **Don’t commit directly to main or develop**
- ✅ **Always create a PR** for merging
- ✅ **Review teammates’ code** before approving merges
- ⚠️ **Never commit sensitive files** like `.env`, passwords, or large binaries
- ⚙️ **Add `.env` and `node_modules/` to `.gitignore`**

---

## 🧩 Tips for Docker or Local DB Users
If someone uses **Docker** and others use **XAMPP**, that’s fine — just make sure:
- You all use the **same database name** (e.g., `hotel_hris`)
- You **don’t push `.env` or `docker-compose.yml`** if they contain local configs
- Always keep **SQL dumps or migrations** updated and shared when database changes

---

## 🎒 Suggested Folder Branch Focus

| Module | Branch | Lead Dev |
|---------|---------|-----------|
| Employee Management | `feature/employee-module` | Matt |
| Attendance & Timekeeping | `feature/attendance-system` | Kyle |
| Payroll System | `feature/payroll-module` | [Name] |
| Leave Management | `feature/leave-system` | [Name] |
| HR Portal / Admin Dashboard | `feature/hr-dashboard` | [Name] |

---

## 🏁 Merge to Main (Final Version)

When all modules are done and tested:
1. Project lead merges all features into `develop`
2. Final testing on `develop`
3. Then merge `develop` → `main`
4. Tag the version:
   ```bash
   git tag -a v1.0 -m "Final Submission"
   git push origin v1.0
   ```

---

## 🧾 Summary

| Step | Action | Command |
|------|---------|----------|
| 1 | Checkout develop | `git checkout develop` |
| 2 | Create new branch | `git checkout -b feature/<name>` |
| 3 | Commit changes | `git add . && git commit -m "msg"` |
| 4 | Push branch | `git push origin feature/<name>` |
| 5 | Create PR → develop | via GitHub |
| 6 | Merge to main after testing | Lead only |

